-- ==============================================================================
-- Migration: 20261109050000_whatsapp_contact_sharing_hardening.sql
-- Description: WhatsApp Contact Sharing Hardening & Self-Healing Resolution:
--              1. Ensures phone and whatsapp_number columns exist on public.profiles.
--              2. Hardens get_exchange_whatsapp_contact to resolve provider_id from
--                 public.listings when NULL on exchange_requests and self-heal the row.
--              3. Resolves contact details from auth.users metadata if profiles row
--                 is temporarily unsynced or missing whatsapp_number.
--              4. Defaults sharing consent to TRUE when user has provided a WhatsApp
--                 number during registration, unless explicitly opted out.
--              5. Prevents false "missing_number" errors across accepted exchanges.
--              6. Backfills existing profiles and exchange_requests.
-- ==============================================================================

-- 0. Ensure Required Columns Exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_whatsapp_with_exchange BOOLEAN DEFAULT true;

-- Backfill phone to whatsapp_number and vice-versa
UPDATE public.profiles
SET whatsapp_number = phone
WHERE (whatsapp_number IS NULL OR TRIM(whatsapp_number) = '')
  AND (phone IS NOT NULL AND TRIM(phone) <> '');

UPDATE public.profiles
SET phone = whatsapp_number
WHERE (phone IS NULL OR TRIM(phone) = '')
  AND (whatsapp_number IS NOT NULL AND TRIM(whatsapp_number) <> '');

-- 1. Self-Healing, Resilient WhatsApp Contact Retrieval RPC
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
  v_provider_id UUID;
  v_target_profile RECORD;
  v_target_consent BOOLEAN := NULL;
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

  -- C. Robust Provider ID Resolution & Self-Healing:
  -- If provider_id is missing on the exchange_request row, retrieve from listings owner
  v_provider_id := v_req.provider_id;
  IF v_provider_id IS NULL THEN
    SELECT user_id INTO v_provider_id
    FROM public.listings
    WHERE id = v_req.listing_id;

    -- Self-heal exchange_requests record if listing owner was found
    IF v_provider_id IS NOT NULL THEN
      UPDATE public.exchange_requests
      SET provider_id = v_provider_id
      WHERE id = v_req.id;
    END IF;
  END IF;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Exchange listing owner not found for exchange request %.', p_exchange_request_id;
  END IF;

  -- D. Participant Authorization: Caller must be either requester or provider
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

  -- F. State Machine Gate: WhatsApp contact is ONLY released for ACCEPTED exchanges
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

  -- G. Fetch target participant's profile
  SELECT whatsapp_number, phone, phone_number, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF FOUND THEN
    v_raw_wa := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone);
    v_target_consent := v_target_profile.share_whatsapp_with_exchange;
  END IF;

  -- Self-healing fallback: If public.profiles lacks the WhatsApp number, inspect auth.users metadata
  IF v_raw_wa IS NULL OR TRIM(v_raw_wa) = '' THEN
    SELECT 
      COALESCE(raw_user_meta_data->>'whatsapp_number', raw_user_meta_data->>'phone', raw_user_meta_data->>'phone_number'),
      (raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN
    INTO v_meta_wa, v_target_consent
    FROM auth.users
    WHERE id = p_participant_id;

    IF v_meta_wa IS NOT NULL AND TRIM(v_meta_wa) <> '' THEN
      v_raw_wa := v_meta_wa;
      -- Auto-heal public.profiles record
      UPDATE public.profiles
      SET phone = v_meta_wa,
          whatsapp_number = v_meta_wa,
          share_whatsapp_with_exchange = COALESCE(public.profiles.share_whatsapp_with_exchange, v_target_consent, true),
          updated_at = NOW()
      WHERE id = p_participant_id;
    END IF;
  END IF;

  -- H. Normalize Phone Digits
  IF v_raw_wa IS NOT NULL AND TRIM(v_raw_wa) <> '' THEN
    v_clean_wa := regexp_replace(v_raw_wa, '[^\d]', '', 'g');
    -- Strip single leading zero (trunk prefix)
    IF length(v_clean_wa) = 11 AND v_clean_wa LIKE '0%' THEN
      v_clean_wa := substring(v_clean_wa from 2);
    END IF;

    v_wa_digits := length(v_clean_wa);

    -- If exactly 10 digits (standard Indian mobile format without country code), default prefix 91
    IF v_wa_digits = 10 THEN
      v_clean_wa := '91' || v_clean_wa;
      v_wa_digits := 12;
    END IF;
  END IF;

  -- I. Consent Resolution:
  -- If user entered a WhatsApp number and consent was not explicitly set to false, default to TRUE
  IF v_clean_wa IS NOT NULL AND v_target_consent IS NULL THEN
    v_target_consent := TRUE;
  END IF;

  -- J. Distinguish 4 explicit contact states:
  -- 1. Missing number: Target has not entered any number
  -- 2. Invalid number: Target has configured an invalid digit count (<10 or >15)
  -- 3. Sharing disabled: Target has explicitly opted out of sharing
  -- 4. Sharing enabled: Target has valid number and consent is active
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
  ELSIF v_target_consent IS NOT TRUE THEN
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

-- Secure Permissions
REVOKE ALL ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exchange_whatsapp_contact(UUID, UUID) TO authenticated;

-- 2. Authoritative handle_new_user Trigger Update
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
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), '');

  -- When WhatsApp number is provided at signup, default sharing consent to TRUE unless explicitly set to false
  IF v_whatsapp IS NOT NULL THEN
    v_share_wa := COALESCE((NEW.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN, true);
  ELSE
    v_share_wa := COALESCE((NEW.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN, false);
  END IF;

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
    full_name = EXCLUDED.full_name,
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, public.profiles.whatsapp_number),
    share_whatsapp_with_exchange = COALESCE(EXCLUDED.share_whatsapp_with_exchange, public.profiles.share_whatsapp_with_exchange, true),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_verified END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Automatic Backfill & Self-Healing:
-- A. Ensure any profile with a whatsapp_number has share_whatsapp_with_exchange = true if it was null or defaulted false
UPDATE public.profiles
SET share_whatsapp_with_exchange = true
WHERE (whatsapp_number IS NOT NULL AND TRIM(whatsapp_number) <> '')
  AND (share_whatsapp_with_exchange IS NULL OR share_whatsapp_with_exchange = false);

-- B. Backfill provider_id on any exchange_requests that have NULL provider_id
UPDATE public.exchange_requests er
SET provider_id = l.user_id
FROM public.listings l
WHERE er.listing_id = l.id
  AND er.provider_id IS NULL;

