-- ==============================================================================
-- Migration: 20261110010000_simplify_whatsapp_contact_sharing.sql
-- Description: Simplify WhatsApp Contact Sharing:
--              1. Removes separate contact-sharing permission requirement:
--                 A valid saved WhatsApp number is directly sufficient for
--                 contact after an exchange request is accepted.
--              2. Preserves share_whatsapp_with_exchange column on public.profiles
--                 for backwards compatibility without dropping user data.
--              3. Preserves all critical security boundaries:
--                 - Authenticated caller check (auth.uid()).
--                 - Participant authorization check (caller must be requester or provider).
--                 - Target validation (target must be the other participant, not self).
--                 - Status gate (strictly 'accepted' status; pending, rejected,
--                   and cancelled exchanges strictly withhold contact info).
--                 - Search path isolation (SET search_path = '').
--              4. Updates get_exchange_whatsapp_contact() RPC to return contact
--                 details directly when status is accepted and valid number is saved.
--              5. Updates handle_new_user() to maintain backwards-compatible profile
--                 records with share_whatsapp_with_exchange = true.
-- ==============================================================================

-- 0. Ensure share_whatsapp_with_exchange column exists with DEFAULT true for backwards compatibility
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_whatsapp_with_exchange BOOLEAN DEFAULT true;

-- Update column default to true so any legacy queries reading this column see enabled
ALTER TABLE public.profiles ALTER COLUMN share_whatsapp_with_exchange SET DEFAULT true;

-- Set any NULL values to true for consistency
UPDATE public.profiles
SET share_whatsapp_with_exchange = true
WHERE share_whatsapp_with_exchange IS NULL;

-- 1. Simplified, Secure WhatsApp Contact Retrieval RPC
CREATE OR REPLACE FUNCTION public.get_exchange_whatsapp_contact(
  p_exchange_request_id UUID,
  p_participant_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_req RECORD;
  v_provider_id UUID;
  v_target_profile RECORD;
  v_raw_wa TEXT := NULL;
  v_meta_wa TEXT := NULL;
  v_clean_wa TEXT := NULL;
  v_wa_digits INT;
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

  -- C. In-Memory Provider ID Resolution (No database mutation before authorization!)
  v_provider_id := v_req.provider_id;
  IF v_provider_id IS NULL THEN
    SELECT user_id INTO v_provider_id
    FROM public.listings
    WHERE id = v_req.listing_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Exchange listing owner not found for exchange request %.', p_exchange_request_id;
  END IF;

  -- D. Participant Authorization Check: Caller must be either requester or provider
  -- CRITICAL SECURITY GATE: Unauthorized callers are halted immediately
  IF v_caller IS DISTINCT FROM v_req.requester_id AND v_caller IS DISTINCT FROM v_provider_id THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an authorized participant in this exchange request.';
  END IF;

  -- E. Target Participant Validation: Target must be the OTHER party in the exchange
  IF p_participant_id IS DISTINCT FROM v_req.requester_id AND p_participant_id IS DISTINCT FROM v_provider_id THEN
    RAISE EXCEPTION 'Invalid participant requested.';
  END IF;

  IF p_participant_id = v_caller THEN
    RAISE EXCEPTION 'Cannot request own contact details through exchange participant function.';
  END IF;

  -- F. Post-Authorization Self-Healing:
  -- Only AFTER authorization succeeds, self-heal exchange_requests record if provider_id was NULL on the row
  IF v_req.provider_id IS NULL AND v_provider_id IS NOT NULL THEN
    UPDATE public.exchange_requests
    SET provider_id = v_provider_id,
        updated_at = pg_catalog.now()
    WHERE id = v_req.id;
  END IF;

  -- G. State Machine Gate: WhatsApp contact is ONLY released for ACCEPTED exchanges
  -- Pending, rejected, cancelled, and completed exchanges strictly withhold contact details
  IF v_req.status IS DISTINCT FROM 'accepted' THEN
    RETURN pg_catalog.jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'status', v_req.status,
      'notice', 'WhatsApp contact is only accessible while the exchange request is in accepted status.'
    );
  END IF;

  -- H. Fetch target participant's profile
  SELECT whatsapp_number, phone, phone_number
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF FOUND THEN
    v_raw_wa := NULLIF(TRIM(COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone)), '');
  END IF;

  -- I. Inspect auth.users metadata ONLY when number is missing from public.profiles
  IF v_raw_wa IS NULL THEN
    SELECT 
      NULLIF(TRIM(COALESCE(raw_user_meta_data->>'whatsapp_number', raw_user_meta_data->>'phone', raw_user_meta_data->>'phone_number')), '')
    INTO v_meta_wa
    FROM auth.users
    WHERE id = p_participant_id;

    IF v_meta_wa IS NOT NULL THEN
      v_raw_wa := v_meta_wa;

      -- Self-healing fallback for public.profiles: persist number safely
      UPDATE public.profiles
      SET phone = COALESCE(public.profiles.phone, v_meta_wa),
          whatsapp_number = COALESCE(public.profiles.whatsapp_number, v_meta_wa),
          updated_at = pg_catalog.now()
      WHERE id = p_participant_id;
    END IF;
  END IF;

  -- J. Normalize Phone Digits
  IF v_raw_wa IS NOT NULL THEN
    v_clean_wa := pg_catalog.regexp_replace(v_raw_wa, '[^\d]', '', 'g');
    -- Strip single leading zero (trunk prefix in India, e.g. 09876543210 -> 9876543210)
    IF pg_catalog.length(v_clean_wa) = 11 AND v_clean_wa LIKE '0%' THEN
      v_clean_wa := pg_catalog.substr(v_clean_wa, 2);
    END IF;

    v_wa_digits := pg_catalog.length(v_clean_wa);

    -- If exactly 10 digits (standard Indian mobile format without country code), default prefix 91
    IF v_wa_digits = 10 THEN
      v_clean_wa := '91' || v_clean_wa;
      v_wa_digits := 12;
    END IF;
  END IF;

  -- K. Contact State Evaluation:
  -- 1. Missing number: Target has not entered any number
  -- 2. Invalid number: Target has configured an invalid digit count (<10 or >15)
  -- 3. Sharing enabled: Target has valid number; saved number is sufficient after accepted exchange
  IF v_clean_wa IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'missing_number',
      'notice', 'Partner has not configured a WhatsApp number',
      'status', v_req.status
    );
  ELSIF v_wa_digits < 10 OR v_wa_digits > 15 THEN
    RETURN pg_catalog.jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'invalid_number',
      'notice', 'Partner''s WhatsApp number is invalid',
      'status', v_req.status
    );
  ELSE
    RETURN pg_catalog.jsonb_build_object(
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

-- Secure Permissions
REVOKE ALL ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) TO authenticated;

-- 2. Authoritative handle_new_user Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_full_name TEXT;
  v_district TEXT;
  v_whatsapp TEXT;
  v_phone TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', pg_catalog.split_part(NEW.email, '@', 1), 'GreenLoop Member');
  v_district := NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), '');
  v_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
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
    COALESCE(v_whatsapp, v_phone),
    true,
    COALESCE(v_phone, v_whatsapp),
    COALESCE(v_phone, v_whatsapp),
    0,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    whatsapp_number = COALESCE(public.profiles.whatsapp_number, EXCLUDED.whatsapp_number),
    phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
    share_whatsapp_with_exchange = true,
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_verified END,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

