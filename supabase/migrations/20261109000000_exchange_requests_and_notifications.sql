-- ==============================================================================
-- Migration: 20261109000000_exchange_requests_and_notifications.sql
-- Description: Waste Request delivery & visibility: Adds provider_id, indexes,
--              triggers, robust RLS policies, automated event notifications,
--              and atomic handover completion verification.
-- Security:
--   - Explicit safe SET search_path = public, pg_temp on all SECURITY DEFINER functions.
--   - Schema-qualified object references.
--   - Role-specific state transitions and immutable field guards.
--   - Safe backfill of provider_id with orphaned request detection.
--   - Privilege lockdown on public.notifications (trigger-only creation, update only is_read).
--   - Atomic listing status synchronization on request acceptance.
--   - Atomic confirm_exchange_handover function for transactions and EcoPoints.
-- ==============================================================================

-- 1. Safely add provider_id column to exchange_requests if not present
ALTER TABLE public.exchange_requests
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create index for fast provider queries
CREATE INDEX IF NOT EXISTS idx_exchange_requests_provider 
ON public.exchange_requests(provider_id);

-- 3. Safely backfill provider_id on existing rows and inspect for orphaned requests
DO $$
DECLARE
  v_updated_count INT := 0;
  v_orphaned_count INT := 0;
BEGIN
  -- Perform backfill from existing listings
  UPDATE public.exchange_requests er
  SET provider_id = l.user_id
  FROM public.listings l
  WHERE er.listing_id = l.id 
    AND er.provider_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled provider_id for % existing exchange requests.', v_updated_count;

  -- Check for orphaned requests whose listing no longer exists or lacks an owner
  SELECT COUNT(*) INTO v_orphaned_count
  FROM public.exchange_requests er
  LEFT JOIN public.listings l ON er.listing_id = l.id
  WHERE l.id IS NULL OR l.user_id IS NULL;

  IF v_orphaned_count > 0 THEN
    RAISE NOTICE 'Notice: Identified % orphaned exchange requests with unresolvable listing owners. Preserving records with NULL provider_id to prevent data loss.', v_orphaned_count;
  ELSE
    RAISE NOTICE 'All exchange requests have valid listing owners. No orphaned records found.';
  END IF;
END $$;

-- 4. Authoritative Trigger: Ensure provider_id is ALWAYS set from listing owner on insert
CREATE OR REPLACE FUNCTION public.set_exchange_request_provider()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Authoritatively populate provider_id from the selected listing
  SELECT user_id INTO NEW.provider_id
  FROM public.listings
  WHERE id = NEW.listing_id;

  IF NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Target listing does not exist or has no registered owner.';
  END IF;

  -- Prevent users from submitting exchange requests on their own listings
  IF NEW.requester_id = NEW.provider_id THEN
    RAISE EXCEPTION 'Conflict: Waste creators cannot submit exchange requests on their own listings.';
  END IF;

  -- Enforce initial status to 'pending'
  NEW.status := 'pending';
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_exchange_request_provider ON public.exchange_requests;
CREATE TRIGGER trg_set_exchange_request_provider
BEFORE INSERT ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_exchange_request_provider();

-- 5. Database-Level Validation Trigger for Updates
-- Enforces field immutability and role-specific state machine transitions
CREATE OR REPLACE FUNCTION public.validate_exchange_request_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_actual_provider UUID;
BEGIN
  -- Authoritatively derive actual provider
  v_actual_provider := COALESCE(OLD.provider_id, (SELECT user_id FROM public.listings WHERE id = OLD.listing_id));

  -- A. Enforce immutability of core transaction fields
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Restricted: Request ID is immutable.';
  END IF;
  IF NEW.listing_id <> OLD.listing_id THEN
    RAISE EXCEPTION 'Restricted: Listing ID is immutable.';
  END IF;
  IF NEW.requester_id <> OLD.requester_id THEN
    RAISE EXCEPTION 'Restricted: Requester ID is immutable.';
  END IF;
  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id AND OLD.provider_id IS NOT NULL THEN
    RAISE EXCEPTION 'Restricted: Provider ID is immutable.';
  END IF;
  IF NEW.requested_quantity <> OLD.requested_quantity THEN
    RAISE EXCEPTION 'Restricted: Requested quantity is immutable.';
  END IF;
  IF NEW.completion_code <> OLD.completion_code THEN
    RAISE EXCEPTION 'Restricted: Handover verification code is immutable.';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Restricted: Created timestamp is immutable.';
  END IF;

  -- B. Enforce role-specific state machine transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Terminal status checks: once rejected, cancelled, or completed, status cannot transition
    IF OLD.status IN ('rejected', 'cancelled', 'completed') THEN
      RAISE EXCEPTION 'Terminal state: Cannot transition request from % to %.', OLD.status, NEW.status;
    END IF;

    -- Transitions from pending
    IF OLD.status = 'pending' THEN
      IF NEW.status = 'accepted' THEN
        IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM v_actual_provider THEN
          RAISE EXCEPTION 'Permission denied: Only the waste provider can accept this request.';
        END IF;
        IF NEW.pickup_date IS NULL THEN
          NEW.pickup_date := NOW() + INTERVAL '2 days';
        END IF;
      ELSIF NEW.status = 'rejected' THEN
        IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM v_actual_provider THEN
          RAISE EXCEPTION 'Permission denied: Only the waste provider can decline this request.';
        END IF;
      ELSIF NEW.status = 'cancelled' THEN
        IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM OLD.requester_id THEN
          RAISE EXCEPTION 'Permission denied: Only the requester can cancel this request.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid transition: Cannot transition request from pending to %.', NEW.status;
      END IF;
    END IF;

    -- Transitions from accepted
    IF OLD.status = 'accepted' THEN
      IF NEW.status = 'completed' THEN
        IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM v_actual_provider THEN
          RAISE EXCEPTION 'Permission denied: Only the waste provider can complete this request.';
        END IF;
      ELSIF NEW.status = 'cancelled' THEN
        IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM OLD.requester_id AND v_caller IS DISTINCT FROM v_actual_provider THEN
          RAISE EXCEPTION 'Permission denied: Only parties can cancel this request.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid transition: Cannot transition request from accepted to %.', NEW.status;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_exchange_request_update ON public.exchange_requests;
CREATE TRIGGER trg_validate_exchange_request_update
BEFORE UPDATE ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_exchange_request_update();

-- 6. Atomic Listing Status Sync on Exchange Accept
CREATE OR REPLACE FUNCTION public.sync_listing_status_on_exchange_accept()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    UPDATE public.listings
    SET status = 'pending',
        updated_at = NOW()
    WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_listing_status_on_exchange_accept ON public.exchange_requests;
CREATE TRIGGER trg_sync_listing_status_on_exchange_accept
AFTER UPDATE OF status ON public.exchange_requests
FOR EACH ROW
WHEN (NEW.status = 'accepted')
EXECUTE FUNCTION public.sync_listing_status_on_exchange_accept();

-- 7. Row Level Security Policies for exchange_requests
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view their exchange requests" ON public.exchange_requests;
DROP POLICY IF EXISTS "Authenticated users can submit requests" ON public.exchange_requests;
DROP POLICY IF EXISTS "Parties can update their exchange requests" ON public.exchange_requests;

-- SELECT: Requester or Provider (or listing owner fallback) can view
CREATE POLICY "Parties can view their exchange requests" ON public.exchange_requests
FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = provider_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

-- INSERT: Authenticated users can create requests as the requester
CREATE POLICY "Authenticated users can submit requests" ON public.exchange_requests
FOR INSERT WITH CHECK (
  auth.uid() = requester_id
);

-- UPDATE: Parties can update (fine-grained role rules enforced by validate_exchange_request_update)
CREATE POLICY "Parties can update their exchange requests" ON public.exchange_requests
FOR UPDATE USING (
  auth.uid() = requester_id OR 
  auth.uid() = provider_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

-- 8. Hardened Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- UPDATE: Users can update their own notifications (validated by trigger below)
CREATE POLICY "Users can mark own notifications read" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Immutability trigger for notifications: ensures clients only change is_read
CREATE OR REPLACE FUNCTION public.protect_notification_immutability()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id <> OLD.id OR
     NEW.user_id <> OLD.user_id OR
     NEW.title <> OLD.title OR
     NEW.message <> OLD.message OR
     NEW.type <> OLD.type OR
     NEW.link IS DISTINCT FROM OLD.link OR
     NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Restricted: Only the read status (is_read) of a notification can be updated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_notification_immutability ON public.notifications;
CREATE TRIGGER trg_protect_notification_immutability
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.protect_notification_immutability();

-- 9. Transactional Notification Generator: Sole Authoritative Source
CREATE OR REPLACE FUNCTION public.notify_exchange_request_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing_title TEXT;
  v_requester_name TEXT;
  v_provider_id UUID;
BEGIN
  SELECT title, user_id INTO v_listing_title, v_provider_id
  FROM public.listings
  WHERE id = NEW.listing_id;

  SELECT full_name INTO v_requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;

  IF TG_OP = 'INSERT' THEN
    -- Event: New Request -> notify provider
    INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
    VALUES (
      COALESCE(NEW.provider_id, v_provider_id),
      'New Exchange Request',
      COALESCE(v_requester_name, 'A community member') || ' requested ' || NEW.requested_quantity || ' units of "' || COALESCE(v_listing_title, 'your listing') || '"',
      'request',
      '/exchanges',
      false,
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      -- Event: Request Accepted -> notify requester without completion code disclosure
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        NEW.requester_id,
        'Request Accepted',
        'Your request for "' || COALESCE(v_listing_title, 'material') || '" was accepted by the provider! Coordinate pickup details in chat and present your pass code at pickup.',
        'request',
        '/exchanges',
        false,
        NOW()
      );
    ELSIF NEW.status = 'rejected' THEN
      -- Event: Request Declined -> notify requester
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        NEW.requester_id,
        'Request Declined',
        'Your request for "' || COALESCE(v_listing_title, 'material') || '" was declined by the provider.',
        'request',
        '/exchanges',
        false,
        NOW()
      );
    ELSIF NEW.status = 'cancelled' THEN
      -- Event: Request Cancelled -> notify provider
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        COALESCE(NEW.provider_id, v_provider_id),
        'Request Cancelled',
        COALESCE(v_requester_name, 'The requester') || ' cancelled their exchange request for "' || COALESCE(v_listing_title, 'your listing') || '".',
        'request',
        '/exchanges',
        false,
        NOW()
      );
    ELSIF NEW.status = 'completed' THEN
      -- Event: Completed Handover -> notify both provider and requester
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES
        (
          COALESCE(NEW.provider_id, v_provider_id),
          'Exchange Completed',
          'Handover verified for "' || COALESCE(v_listing_title, 'material') || '". EcoPoints credited!',
          'points',
          '/impact',
          false,
          NOW()
        ),
        (
          NEW.requester_id,
          'Material Received',
          'Collection verified for "' || COALESCE(v_listing_title, 'material') || '". EcoPoints credited!',
          'points',
          '/impact',
          false,
          NOW()
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_exchange_request_event ON public.exchange_requests;
CREATE TRIGGER trg_notify_exchange_request_event
AFTER INSERT OR UPDATE OF status ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_exchange_request_event();

-- 10. Atomic Handover Completion Function (Requirement 6)
-- Persists transaction, updates statuses, credits EcoPoints, and triggers completion notifications atomically
CREATE OR REPLACE FUNCTION public.confirm_exchange_handover(
  p_request_id UUID,
  p_completion_code TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_req RECORD;
  v_listing RECORD;
  v_tx_id UUID;
  v_co2_factor NUMERIC := 1.8;
  v_landfill_factor NUMERIC := 1.1;
  v_co2_saved NUMERIC;
  v_landfill_saved NUMERIC;
  v_points_gen INT := 50;
  v_points_rec INT := 30;
BEGIN
  -- 0. Authentication check: Require authenticated caller
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Caller must be authenticated to confirm handover.';
  END IF;

  -- 1. Fetch exchange request with row lock
  SELECT * INTO v_req
  FROM public.exchange_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange request % not found.', p_request_id;
  END IF;

  IF v_req.status <> 'accepted' THEN
    RAISE EXCEPTION 'Exchange request must be in accepted status to confirm handover. Current status: %', v_req.status;
  END IF;

  -- 2. Authorization check: Verify caller is the actual waste provider
  IF v_caller IS DISTINCT FROM v_req.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Only the waste provider can confirm handover.';
  END IF;

  -- 3. Verify pickup completion code (strict check, no bypass codes allowed)
  IF p_completion_code IS NULL 
     OR v_req.completion_code IS NULL 
     OR UPPER(TRIM(p_completion_code)) <> UPPER(TRIM(v_req.completion_code)) THEN
    RAISE EXCEPTION 'Invalid pickup verification code.';
  END IF;

  -- 4. Fetch associated listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = v_req.listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated listing % not found.', v_req.listing_id;
  END IF;

  -- 5. Calculate sustainability impact metrics
  v_co2_saved := ROUND((v_req.requested_quantity * v_co2_factor)::NUMERIC, 1);
  v_landfill_saved := ROUND((v_req.requested_quantity * v_landfill_factor)::NUMERIC, 1);

  -- 6. Transition exchange request to completed
  UPDATE public.exchange_requests
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- 7. Transition listing to completed
  UPDATE public.listings
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = v_listing.id;

  -- 8. Atomically insert verified transaction
  INSERT INTO public.transactions (
    listing_id,
    exchange_request_id,
    generator_id,
    recipient_id,
    category_id,
    quantity,
    unit,
    co2_saved_kg,
    landfill_saved_kg,
    eco_points_awarded,
    verified_by_recipient,
    notes,
    completed_at
  ) VALUES (
    v_listing.id,
    v_req.id,
    v_req.provider_id,
    v_req.requester_id,
    v_listing.category_id,
    v_req.requested_quantity,
    v_listing.unit,
    v_co2_saved,
    v_landfill_saved,
    v_points_gen + v_points_rec,
    TRUE,
    'Verified circular exchange via GreenLoop.',
    NOW()
  ) RETURNING id INTO v_tx_id;

  -- 9. Atomically record EcoPoints ledger entries
  INSERT INTO public.eco_points (user_id, points, action_type, reference_id, description, created_at)
  VALUES
    (v_req.provider_id, v_points_gen, 'exchange_completed', v_tx_id, 'Diverted ' || v_req.requested_quantity || ' ' || v_listing.unit || ' of ' || v_listing.title, NOW()),
    (v_req.requester_id, v_points_rec, 'exchange_completed', v_tx_id, 'Collected and repurposed ' || v_req.requested_quantity || ' ' || v_listing.unit || ' of ' || v_listing.title, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'co2_saved_kg', v_co2_saved,
    'landfill_saved_kg', v_landfill_saved,
    'points_generator', v_points_gen,
    'points_recipient', v_points_rec
  );
END;
$$ LANGUAGE plpgsql;

-- 11. Database Privileges & Grants Lockdown (Requirement 10)
-- Table-level, column-level, and function-level privileges ensure defense-in-depth

-- Notifications: clients cannot insert or delete; only read and update is_read
REVOKE ALL ON public.notifications FROM PUBLIC, anon;
GRANT SELECT, UPDATE (is_read) ON public.notifications TO authenticated;
REVOKE INSERT, DELETE ON public.notifications FROM authenticated;

-- Exchange Requests: clients can select, insert, and update; delete is revoked
REVOKE ALL ON public.exchange_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.exchange_requests TO authenticated;
REVOKE DELETE ON public.exchange_requests FROM authenticated;

-- Function Execution Lockdown: Explicitly revoke from PUBLIC and anon on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_exchange_request_provider() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_exchange_request_update() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_listing_status_on_exchange_accept() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_notification_immutability() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_exchange_request_event() FROM PUBLIC, anon;

-- Grant execution strictly to authenticated users
GRANT EXECUTE ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_exchange_request_provider() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_exchange_request_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_listing_status_on_exchange_accept() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_notification_immutability() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_exchange_request_event() TO authenticated;
