-- ==============================================================================
-- Migration: 20261110020000_listing_lifecycle_and_exchange_hardening.sql
-- Description: Marketplace Listing Lifecycle & WhatsApp Consistency Hardening:
--              1. Full Lifecycle Management:
--                 AVAILABLE ('active') -> REQUESTED -> ACCEPTED ('reserved') ->
--                 HANDOVER VERIFICATION -> COMPLETED ('completed')
--              2. Listings remain visible on the marketplace while reserved
--                 (status IN ('active', 'reserved', 'pending', 'in_progress')).
--              3. Only successful pickup code verification in confirm_exchange_handover()
--                 transitions listing to 'completed' and removes it from active marketplace.
--              4. Concurrency Guard: Atomic accept_exchange_request() prevents competing
--                 duplicate claims on the same material batch.
--              5. Reversibility: If an accepted exchange is cancelled or rejected,
--                 the listing status is safely restored to 'active'.
--              6. Guaranteed provider_id persistence ensures 100% reliable
--                 bidirectional participant resolution for WhatsApp click-to-chat.
-- ==============================================================================

-- 1. Ensure public.listings status column allows 'reserved'
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Backfill any unexpected NULL status
UPDATE public.listings
SET status = 'active'
WHERE status IS NULL;

-- 2. Update Row Level Security on public.listings
-- Both active and reserved listings MUST be viewable by everyone so that:
-- a) Marketplace visitors can see items in progress / reserved.
-- b) Requesters can always join exchange_requests.listing even when accepted.
-- c) Provider ID is never obscured during participant resolution.
DROP POLICY IF EXISTS "Active public listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Active and reserved public listings are viewable by everyone" ON public.listings;

CREATE POLICY "Active and reserved public listings are viewable by everyone"
  ON public.listings
  FOR SELECT
  USING (
    status IN ('active', 'reserved', 'pending', 'in_progress')
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 3. Atomic Exchange Acceptance Function with Concurrency & Duplicate Claim Protection
CREATE OR REPLACE FUNCTION public.accept_exchange_request(
  p_request_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_req RECORD;
  v_listing RECORD;
  v_existing_accepted UUID;
BEGIN
  -- A. Authentication Check
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Caller must be authenticated to accept exchange.';
  END IF;

  -- B. Lock and fetch target exchange request
  SELECT * INTO v_req
  FROM public.exchange_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange request % not found.', p_request_id;
  END IF;

  -- C. Lock and fetch associated listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = v_req.listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated listing % not found.', v_req.listing_id;
  END IF;

  -- D. Participant Authorization: Caller must be the verified owner of the listing
  IF v_caller IS DISTINCT FROM v_listing.user_id AND v_caller IS DISTINCT FROM v_req.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Only the listing owner can accept this request.';
  END IF;

  -- E. State Machine Check: Only pending requests can be accepted
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Invalid status transition: Only pending requests can be accepted. Current status: %', v_req.status;
  END IF;

  -- F. Prevent Acceptance on Completed or Cancelled Listings
  IF v_listing.status = 'completed' THEN
    RAISE EXCEPTION 'Listing % has already been completed in another exchange.', v_listing.id;
  ELSIF v_listing.status = 'cancelled' THEN
    RAISE EXCEPTION 'Listing % has been cancelled by the owner.', v_listing.id;
  END IF;

  -- G. Mutual Exclusion / Concurrency Protection:
  -- Ensure no other exchange request for this listing is already accepted
  SELECT id INTO v_existing_accepted
  FROM public.exchange_requests
  WHERE listing_id = v_listing.id
    AND status = 'accepted'
    AND id <> p_request_id
  LIMIT 1;

  IF v_existing_accepted IS NOT NULL THEN
    RAISE EXCEPTION 'This material batch already has an active accepted exchange (%). Concurrency violation prevented.', v_existing_accepted;
  END IF;

  -- H. Atomic Mutation 1: Update request to 'accepted' and enforce provider_id
  UPDATE public.exchange_requests
  SET status = 'accepted',
      provider_id = v_listing.user_id,
      pickup_date = COALESCE(v_req.pickup_date, pg_catalog.now() + interval '2 days'),
      updated_at = pg_catalog.now()
  WHERE id = p_request_id;

  -- I. Atomic Mutation 2: Mark listing as 'reserved' (remains visible on marketplace, marked reserved)
  UPDATE public.listings
  SET status = 'reserved',
      updated_at = pg_catalog.now()
  WHERE id = v_listing.id;

  -- J. Atomic Notification to Requester
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    created_at
  ) VALUES (
    v_req.requester_id,
    'request_accepted',
    'Exchange Request Accepted',
    'Your request for "' || v_listing.title || '" was accepted! Message the owner on WhatsApp to coordinate pickup.',
    '/exchanges',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'listing_id', v_listing.id,
    'status', 'accepted',
    'listing_status', 'reserved'
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.accept_exchange_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_exchange_request(UUID) TO authenticated;

-- 4. Lifecycle Synchronization Trigger on public.exchange_requests
CREATE OR REPLACE FUNCTION public.sync_listing_status_on_exchange_lifecycle()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Transition 1: Request becomes accepted -> Reserve listing (keep visible on marketplace!)
    IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
      UPDATE public.listings
      SET status = 'reserved',
          updated_at = pg_catalog.now()
      WHERE id = NEW.listing_id
        AND status <> 'completed';

    -- Transition 2: Request was accepted but is now cancelled/rejected -> Restore listing to 'active'
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('cancelled', 'rejected') THEN
      -- Only restore if no other accepted request exists for this listing
      IF NOT EXISTS (
        SELECT 1 FROM public.exchange_requests
        WHERE listing_id = NEW.listing_id
          AND status = 'accepted'
          AND id <> NEW.id
      ) THEN
        UPDATE public.listings
        SET status = 'active',
            updated_at = pg_catalog.now()
        WHERE id = NEW.listing_id
          AND status = 'reserved';
      END IF;

    -- Transition 3: Request completes -> Mark listing as 'completed' (removed from marketplace)
    ELSIF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      UPDATE public.listings
      SET status = 'completed',
          updated_at = pg_catalog.now()
      WHERE id = NEW.listing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_listing_status_on_exchange_accept ON public.exchange_requests;
DROP TRIGGER IF EXISTS trg_sync_listing_status_on_exchange_lifecycle ON public.exchange_requests;

CREATE TRIGGER trg_sync_listing_status_on_exchange_lifecycle
AFTER UPDATE OF status ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_listing_status_on_exchange_lifecycle();

-- 5. Atomic Handover Verification RPC (Transfers material, marks completed, updates metrics)
CREATE OR REPLACE FUNCTION public.confirm_exchange_handover(
  p_request_id UUID,
  p_completion_code TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
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
  -- A. Authentication Check: Require authenticated caller
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Caller must be authenticated to confirm handover.';
  END IF;

  -- B. Fetch and lock exchange request
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

  -- C. Fetch and lock associated listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = v_req.listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated listing % not found.', v_req.listing_id;
  END IF;

  -- D. Authorization Check: Caller MUST be the verified provider of this request
  IF v_caller IS DISTINCT FROM v_req.provider_id AND v_caller IS DISTINCT FROM v_listing.user_id THEN
    RAISE EXCEPTION 'Permission denied: Only the waste provider can confirm handover.';
  END IF;

  -- E. Strict Verification of Pickup Completion Code
  -- Only the exact stored completion code authorizes verification.
  -- Invalid codes or bypass codes are strictly rejected.
  IF p_completion_code IS NULL 
     OR v_req.completion_code IS NULL 
     OR UPPER(TRIM(p_completion_code)) <> UPPER(TRIM(v_req.completion_code)) THEN
    RAISE EXCEPTION 'Invalid pickup verification code.';
  END IF;

  -- F. Calculate sustainability impact metrics
  v_co2_saved := pg_catalog.round((v_req.requested_quantity * v_co2_factor)::NUMERIC, 1);
  v_landfill_saved := pg_catalog.round((v_req.requested_quantity * v_landfill_factor)::NUMERIC, 1);

  -- G. Atomically transition exchange request to completed
  UPDATE public.exchange_requests
  SET status = 'completed',
      updated_at = pg_catalog.now()
  WHERE id = p_request_id;

  -- H. Atomically transition listing to completed (removes from active marketplace inventory)
  UPDATE public.listings
  SET status = 'completed',
      updated_at = pg_catalog.now()
  WHERE id = v_listing.id;

  -- I. Atomically insert verified transaction
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
    'Verified circular exchange via GreenLoop handover.',
    pg_catalog.now()
  ) RETURNING id INTO v_tx_id;

  -- J. Atomically record EcoPoints ledger entries
  INSERT INTO public.eco_points (user_id, points, action_type, reference_id, description, created_at)
  VALUES
    (v_req.provider_id, v_points_gen, 'exchange_completed', v_tx_id, 'Diverted ' || v_req.requested_quantity || ' ' || v_listing.unit || ' of ' || v_listing.title, pg_catalog.now()),
    (v_req.requester_id, v_points_rec, 'exchange_completed', v_tx_id, 'Collected and repurposed ' || v_req.requested_quantity || ' ' || v_listing.unit || ' of ' || v_listing.title, pg_catalog.now());

  -- K. Increment user profile EcoPoint balances
  UPDATE public.profiles
  SET eco_points_balance = COALESCE(eco_points_balance, 0) + v_points_gen,
      updated_at = pg_catalog.now()
  WHERE id = v_req.provider_id;

  UPDATE public.profiles
  SET eco_points_balance = COALESCE(eco_points_balance, 0) + v_points_rec,
      updated_at = pg_catalog.now()
  WHERE id = v_req.requester_id;

  -- L. Send handover completion notifications to both parties
  INSERT INTO public.notifications (user_id, type, title, message, link, created_at)
  VALUES
    (v_req.provider_id, 'handover_completed', 'Handover Verified & Completed', 'Material handover verified! You earned 50 EcoPoints.', '/dashboard', pg_catalog.now()),
    (v_req.requester_id, 'handover_completed', 'Material Collection Completed', 'Collection confirmed! You earned 30 EcoPoints.', '/dashboard', pg_catalog.now());

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'co2_saved_kg', v_co2_saved,
    'landfill_saved_kg', v_landfill_saved,
    'points_generator', v_points_gen,
    'points_recipient', v_points_rec,
    'listing_status', 'completed',
    'status', 'completed'
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) TO authenticated;
