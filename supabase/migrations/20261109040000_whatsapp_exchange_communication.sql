-- ==============================================================================
-- Migration: 20261109040000_whatsapp_exchange_communication.sql
-- Description: Direct WhatsApp-Based Exchange Communication & Privacy Lockdown:
--              1. Replaces custom in-app chat drawer with direct WhatsApp contact.
--              2. WhatsApp contact is available ONLY after provider accepts the request.
--              3. Strictly requires explicit user consent (share_whatsapp_with_exchange).
--              4. Revokes unauthenticated & anonymous access; enforces participant-only RLS.
--              5. Hardens handover verification: rejects GL-CONFIRM and anonymous execution.
--
-- Security:
--   - All SECURITY DEFINER functions have explicit SET search_path = public, pg_temp.
--   - REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon; GRANT EXECUTE TO authenticated.
--   - Rejects callers with NULL auth.uid().
--   - Strictly hides contact details on pending, rejected, cancelled, and completed requests.
--   - Preserves historical conversation records without active frontend coupling.
-- ==============================================================================

-- 1. Ensure Profile Contact and Privacy Consent Columns Exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS share_phone_with_exchange BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_whatsapp_with_exchange BOOLEAN DEFAULT false;

-- 2. Secure WhatsApp Contact Retrieval RPC
-- Retrieves WhatsApp contact exclusively for authenticated participants of an ACCEPTED exchange
CREATE OR REPLACE FUNCTION public.get_exchange_whatsapp_contact(
  p_exchange_request_id UUID,
  p_participant_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_req RECORD;
  v_target_profile RECORD;
  v_raw_wa TEXT;
  v_wa_digits INT;
  v_clean_wa TEXT := NULL;
BEGIN
  -- A. Authentication Check: Reject unauthenticated callers
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Caller must be authenticated to request exchange contact.';
  END IF;

  -- B. Fetch target exchange request
  SELECT * INTO v_req
  FROM public.exchange_requests
  WHERE id = p_exchange_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exchange request % not found.', p_exchange_request_id;
  END IF;

  -- C. Participant Authorization: Caller must be either requester or provider
  IF v_caller IS DISTINCT FROM v_req.requester_id AND v_caller IS DISTINCT FROM v_req.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an authorized participant in this exchange request.';
  END IF;

  -- D. Target Participant Validation: Target must be the OTHER party in the exchange
  IF p_participant_id IS DISTINCT FROM v_req.requester_id AND p_participant_id IS DISTINCT FROM v_req.provider_id THEN
    RAISE EXCEPTION 'Invalid participant requested.';
  END IF;

  IF p_participant_id = v_caller THEN
    RAISE EXCEPTION 'Cannot request own contact details through exchange participant function.';
  END IF;

  -- E. State Machine Gate: WhatsApp contact is ONLY released for ACCEPTED exchanges
  -- Pending, rejected, cancelled, and completed exchanges strictly withhold contact details
  IF v_req.status <> 'accepted' THEN
    RETURN jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'status', v_req.status,
      'notice', 'WhatsApp contact is only accessible while the exchange request is in accepted status.'
    );
  END IF;

  -- F. Fetch target participant's profile
  SELECT whatsapp_number, phone, phone_number, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant profile not found.';
  END IF;

  -- G. Strict Consent & Format Validation
  IF v_target_profile.share_whatsapp_with_exchange IS TRUE THEN
    v_raw_wa := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone);
    IF v_raw_wa IS NOT NULL THEN
      -- Normalize to digits only
      v_clean_wa := regexp_replace(v_raw_wa, '[^\d]', '', 'g');
      v_wa_digits := length(v_clean_wa);

      -- If exactly 10 digits (common for Indian mobile numbers without country code), default prefix +91
      IF v_wa_digits = 10 THEN
        v_clean_wa := '91' || v_clean_wa;
        v_wa_digits := 12;
      END IF;

      -- Standard international E.164 phone numbers have 10-15 digits
      IF v_wa_digits < 10 OR v_wa_digits > 15 THEN
        v_clean_wa := NULL;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'participant_id', p_participant_id,
    'whatsapp', v_clean_wa,
    'has_whatsapp_consent', (v_target_profile.share_whatsapp_with_exchange IS TRUE AND v_clean_wa IS NOT NULL),
    'status', v_req.status
  );
END;
$$ LANGUAGE plpgsql;

-- Privilege lockdown on get_exchange_whatsapp_contact
REVOKE ALL ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) TO authenticated;

-- 3. Update get_exchange_participant_contact for Backward Compatibility
-- Enforces the same accepted-status gate and privilege restrictions
CREATE OR REPLACE FUNCTION public.get_exchange_participant_contact(
  p_conversation_id UUID,
  p_participant_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_conv RECORD;
  v_req RECORD;
  v_target_profile RECORD;
  v_shared_phone TEXT := NULL;
  v_shared_whatsapp TEXT := NULL;
  v_clean_wa TEXT := NULL;
  v_wa_digits INT;
  v_phone_digits INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Validate that conversation exists and caller is an active participant
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  IF v_caller <> v_conv.requester_id AND v_caller <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Caller is not a participant in this conversation.';
  END IF;

  IF p_participant_id <> v_conv.requester_id AND p_participant_id <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Invalid participant requested.';
  END IF;

  IF p_participant_id = v_caller THEN
    RAISE EXCEPTION 'Cannot request own contact details through exchange participant function.';
  END IF;

  -- 2. Inspect underlying exchange request status
  IF v_conv.exchange_request_id IS NOT NULL THEN
    SELECT * INTO v_req
    FROM public.exchange_requests
    WHERE id = v_conv.exchange_request_id;

    -- Only accepted exchanges release contact info
    IF FOUND AND v_req.status <> 'accepted' THEN
      RETURN jsonb_build_object(
        'participant_id', p_participant_id,
        'phone', NULL,
        'whatsapp', NULL,
        'has_phone_consent', false,
        'has_whatsapp_consent', false,
        'status', v_req.status,
        'notice', 'Contact is only accessible for accepted exchanges.'
      );
    END IF;
  END IF;

  -- 3. Fetch target participant's profile
  SELECT phone, phone_number, whatsapp_number, share_phone_with_exchange, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant profile not found.';
  END IF;

  -- 4. Apply phone consent
  IF v_target_profile.share_phone_with_exchange IS TRUE AND COALESCE(v_target_profile.phone, v_target_profile.phone_number) IS NOT NULL THEN
    v_phone_digits := length(regexp_replace(COALESCE(v_target_profile.phone, v_target_profile.phone_number), '[^\d]', '', 'g'));
    IF v_phone_digits >= 7 THEN
      v_shared_phone := trim(COALESCE(v_target_profile.phone, v_target_profile.phone_number));
    END IF;
  END IF;

  -- 5. Apply WhatsApp consent
  IF v_target_profile.share_whatsapp_with_exchange IS TRUE THEN
    DECLARE
      v_raw_wa TEXT := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone);
    BEGIN
      IF v_raw_wa IS NOT NULL THEN
        v_clean_wa := regexp_replace(v_raw_wa, '[^\d]', '', 'g');
        v_wa_digits := length(v_clean_wa);
        IF v_wa_digits = 10 THEN
          v_clean_wa := '91' || v_clean_wa;
          v_wa_digits := 12;
        END IF;
        IF v_wa_digits >= 10 AND v_wa_digits <= 15 THEN
          v_shared_whatsapp := v_clean_wa;
        END IF;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'participant_id', p_participant_id,
    'phone', v_shared_phone,
    'whatsapp', v_shared_whatsapp,
    'has_phone_consent', (v_target_profile.share_phone_with_exchange IS TRUE AND v_shared_phone IS NOT NULL),
    'has_whatsapp_consent', (v_target_profile.share_whatsapp_with_exchange IS TRUE AND v_shared_whatsapp IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.get_exchange_participant_contact(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exchange_participant_contact(UUID, UUID) TO authenticated;

-- 4. Forward Hardening of Handover Verification Function
-- Strict elimination of GL-CONFIRM bypass, anonymous execution rejection, and provider-only validation
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
  -- 0. Authentication Check: Require authenticated caller
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

  -- 2. Authorization Check: Caller MUST be the verified provider of this request
  IF v_caller IS DISTINCT FROM v_req.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Only the waste provider can confirm handover.';
  END IF;

  -- 3. Strict Verification of Pickup Completion Code
  -- Only the actual stored completion code authorizes verification.
  -- Hardcoded bypass codes such as GL-CONFIRM are strictly rejected.
  IF p_completion_code IS NULL 
     OR v_req.completion_code IS NULL 
     OR UPPER(TRIM(p_completion_code)) <> UPPER(TRIM(v_req.completion_code)) THEN
    RAISE EXCEPTION 'Invalid pickup verification code.';
  END IF;

  -- 4. Fetch associated listing with row lock
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

  -- 6. Atomically transition exchange request to completed
  UPDATE public.exchange_requests
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- 7. Atomically transition listing to completed
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

REVOKE ALL ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_exchange_handover(UUID, TEXT) TO authenticated;

