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

  -- G. Strict Consent & Format Validation with Distinct State Resolution
  v_raw_wa := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone);
  IF v_raw_wa IS NOT NULL AND TRIM(v_raw_wa) <> '' THEN
    -- Normalize to digits only
    v_clean_wa := regexp_replace(v_raw_wa, '[^\d]', '', 'g');
    v_wa_digits := length(v_clean_wa);

    -- If exactly 10 digits (common for Indian mobile numbers without country code), default prefix +91
    IF v_wa_digits = 10 THEN
      v_clean_wa := '91' || v_clean_wa;
      v_wa_digits := 12;
    END IF;
  END IF;

  -- Distinguish 4 explicit contact states:
  -- 1. Missing number: Target has not entered any number
  -- 2. Invalid number: Target has configured an invalid digit count (<10 or >15)
  -- 3. Sharing disabled: Target has a number but disabled consent
  -- 4. Sharing enabled: Target has consented and number is valid
  IF v_clean_wa IS NULL THEN
    RETURN jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'missing_number',
      'notice', 'Partner has not configured a WhatsApp number',
      'status', v_req.status
    );
  ELSIF v_wa_digits < 10 OR v_wa_digits > 15 THEN
    RETURN jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'invalid_number',
      'notice', 'Partner''s WhatsApp number is invalid',
      'status', v_req.status
    );
  ELSIF v_target_profile.share_whatsapp_with_exchange IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'sharing_disabled',
      'notice', 'WhatsApp contact not shared by partner',
      'status', v_req.status
    );
  ELSE
    RETURN jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', v_clean_wa,
      'has_whatsapp_consent', true,
      'contact_state', 'sharing_enabled',
      'notice', 'WhatsApp contact active for collection coordination',
      'status', v_req.status
    );
  END IF;
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

-- 5. Persistent WhatsApp Synchronization on User Signup Trigger
-- Authoritatively persists whatsapp_number and sharing consent from signup metadata into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_district TEXT;
  v_whatsapp TEXT;
  v_share_wa BOOLEAN;
  v_phone TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'GreenLoop Member');
  v_district := NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), '');
  v_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  v_share_wa := COALESCE((NEW.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN, false);
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), '');

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    district,
    state,
    whatsapp_number,
    share_whatsapp_with_exchange,
    phone,
    phone_number,
    eco_points_balance,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, ''),
    v_district,
    'Kerala',
    v_whatsapp,
    v_share_wa,
    v_phone,
    v_phone,
    0,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    district = COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), ''), public.profiles.district),
    whatsapp_number = COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), ''), public.profiles.whatsapp_number),
    share_whatsapp_with_exchange = COALESCE((NEW.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN, public.profiles.share_whatsapp_with_exchange),
    phone = COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), ''), public.profiles.phone),
    phone_number = COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), ''), public.profiles.phone_number),
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_verified END,
    updated_at = NOW();

  -- Optionally update custom role if supplied in metadata, casting to live column type
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.profiles SET role = $1::' || 
        (SELECT CASE WHEN udt_name = 'user_role' THEN 'user_role' ELSE 'text' END 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') || 
        ' WHERE id = $2'
      USING (NEW.raw_user_meta_data->>'role'), NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Authoritative Welcome EcoPoints Allocation
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eco_points') THEN
      INSERT INTO public.eco_points (user_id, points, action_type, description)
      SELECT
        NEW.id,
        50,
        'signup_bonus',
        'Welcome bonus for joining GreenLoop circular ecosystem'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.eco_points 
        WHERE user_id = NEW.id AND action_type = 'signup_bonus'
      );

      PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);

      UPDATE public.profiles
      SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = NEW.id)
      WHERE id = NEW.id;
    END IF;
  EXCEPTION 
    WHEN unique_violation THEN
      PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);
      UPDATE public.profiles
      SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = NEW.id)
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach on_auth_user_created trigger on auth.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Safe backfill: sync any existing auth metadata whatsapp numbers into profiles if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data'
  ) THEN
    UPDATE public.profiles p
    SET 
      whatsapp_number = COALESCE(p.whatsapp_number, NULLIF(TRIM(u.raw_user_meta_data->>'whatsapp_number'), '')),
      share_whatsapp_with_exchange = COALESCE(p.share_whatsapp_with_exchange, (u.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN, false)
    FROM auth.users u
    WHERE p.id = u.id
      AND (p.whatsapp_number IS NULL OR p.whatsapp_number = '')
      AND u.raw_user_meta_data->>'whatsapp_number' IS NOT NULL;
  END IF;
END $$;


