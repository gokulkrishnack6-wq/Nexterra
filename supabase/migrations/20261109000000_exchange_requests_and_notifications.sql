-- ==============================================================================
-- Migration: 20261109000000_exchange_requests_and_notifications.sql
-- Description: Waste Request delivery & visibility: Adds provider_id, indexes,
--              triggers, robust RLS policies, and automated event notifications.
-- Security:    Hardens RLS on public.notifications (trigger-only creation, immutable
--              payloads, update restricted to is_read), enforces strict database-level
--              authorization on exchange requests (immutability of core fields,
--              role-specific state transitions).
-- ==============================================================================

-- 1. Safely add provider_id column to exchange_requests if not present
ALTER TABLE public.exchange_requests
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create index for fast provider queries
CREATE INDEX IF NOT EXISTS idx_exchange_requests_provider 
ON public.exchange_requests(provider_id);

-- 3. Backfill provider_id on any legacy rows from public.listings
UPDATE public.exchange_requests er
SET provider_id = l.user_id
FROM public.listings l
WHERE er.listing_id = l.id AND er.provider_id IS NULL;

-- 4. Authoritative Trigger: Ensure provider_id is ALWAYS set from listing owner
CREATE OR REPLACE FUNCTION public.set_exchange_request_provider()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_exchange_request_provider ON public.exchange_requests;
CREATE TRIGGER trg_set_exchange_request_provider
BEFORE INSERT ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_exchange_request_provider();

-- 5. Database-Level Validation Trigger for Updates (Finding 4)
-- Enforces field immutability and role-specific state machine transitions
CREATE OR REPLACE FUNCTION public.validate_exchange_request_update()
RETURNS TRIGGER AS $$
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
    -- Only pending requests can be accepted, rejected, or cancelled
    IF OLD.status <> 'pending' AND NEW.status IN ('accepted', 'rejected', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid transition: Cannot transition request from % to %.', OLD.status, NEW.status;
    END IF;

    -- Acceptance: ONLY the provider can accept
    IF NEW.status = 'accepted' THEN
      IF v_caller IS DISTINCT FROM v_actual_provider THEN
        RAISE EXCEPTION 'Permission denied: Only the waste provider can accept this request.';
      END IF;
      -- Pickup date should be set when accepting
      IF NEW.pickup_date IS NULL THEN
        NEW.pickup_date := NOW() + INTERVAL '2 days';
      END IF;
    END IF;

    -- Rejection: ONLY the provider can decline
    IF NEW.status = 'rejected' THEN
      IF v_caller IS DISTINCT FROM v_actual_provider THEN
        RAISE EXCEPTION 'Permission denied: Only the waste provider can decline this request.';
      END IF;
    END IF;

    -- Cancellation: ONLY the requester can cancel
    IF NEW.status = 'cancelled' THEN
      IF v_caller IS DISTINCT FROM OLD.requester_id THEN
        RAISE EXCEPTION 'Permission denied: Only the requester can cancel this request.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_exchange_request_update ON public.exchange_requests;
CREATE TRIGGER trg_validate_exchange_request_update
BEFORE UPDATE ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_exchange_request_update();

-- 6. Row Level Security Policies for exchange_requests
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

-- 7. Hardened Notifications RLS (Finding 3)
-- Strict lockdown: Clients CANNOT directly insert notifications (prevents spoofing & spam).
-- Creation is restricted exclusively to trusted database triggers and server functions.
-- Updates are strictly limited to marking is_read on own notifications.
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
RETURNS TRIGGER AS $$
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

-- 8. Transactional Notification Generator: Sole Authoritative Source (Finding 2)
CREATE OR REPLACE FUNCTION public.notify_exchange_request_event()
RETURNS TRIGGER AS $$
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
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'accepted' THEN
      -- Event: Request Accepted -> notify requester with pass code
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        NEW.requester_id,
        'Request Accepted',
        'Your request for "' || COALESCE(v_listing_title, 'material') || '" was accepted! Pickup verification code: ' || NEW.completion_code,
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
      -- Event: Completed Handover -> notify both
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_exchange_request_event ON public.exchange_requests;
CREATE TRIGGER trg_notify_exchange_request_event
AFTER INSERT OR UPDATE OF status ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_exchange_request_event();
