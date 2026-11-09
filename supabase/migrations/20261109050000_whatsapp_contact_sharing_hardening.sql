-- ==============================================================================
-- Migration: 20261109050000_whatsapp_contact_sharing_hardening.sql
-- Description: WhatsApp Contact Sharing Hardening & Strict Opt-In Privacy:
--              1. Ensures phone and whatsapp_number columns exist on public.profiles
--                 while strictly preserving existing phone values.
--              2. Adds share_whatsapp_with_exchange with DEFAULT false (opt-in privacy).
--                 Existing users with unknown consent remain disabled by default.
--              3. Enforces strict participant authorization BEFORE any mutations
--                 to exchange_requests (preventing unauthorized provider_id updates).
--              4. Resolves contact details with strict opt-in consent hierarchy:
--                 - Profile consent is authoritative when explicitly set (TRUE or FALSE).
--                 - Metadata consent is inspected only when profile consent is genuinely NULL.
--                 - Unknown / unset consent is strictly treated as FALSE (disabled).
--                 - Entering a WhatsApp number NEVER automatically enables consent.
--              5. Updates handle_new_user() trigger function (automatically invoked by the
--                 existing on_auth_user_created trigger) and preserves explicit opt-in / opt-out
--                 from signup metadata without requiring trigger recreation.
--              6. Accurately distinguishes 4 contact states: missing_number,
--                 invalid_number, sharing_disabled, and sharing_enabled.
--              7. No automatic consent backfill; existing consent values are preserved.
-- ==============================================================================

-- 0. Ensure Required Columns Exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
-- Add share_whatsapp_with_exchange with DEFAULT false so existing users are NOT opted in automatically
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_whatsapp_with_exchange BOOLEAN DEFAULT false;
-- Explicitly enforce column default to false (preserves all existing TRUE and FALSE values)
ALTER TABLE public.profiles ALTER COLUMN share_whatsapp_with_exchange SET DEFAULT false;

-- Backfill phone to whatsapp_number and vice-versa (preserving existing non-empty values)
UPDATE public.profiles
SET whatsapp_number = phone
WHERE (whatsapp_number IS NULL OR TRIM(whatsapp_number) = '')
  AND (phone IS NOT NULL AND TRIM(phone) <> '');

UPDATE public.profiles
SET phone = whatsapp_number
WHERE (phone IS NULL OR TRIM(phone) = '')
  AND (whatsapp_number IS NOT NULL AND TRIM(whatsapp_number) <> '');

-- 1. Self-Healing, Resilient WhatsApp Contact Retrieval RPC (Strict Opt-In)
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
  v_profile_consent BOOLEAN := NULL;
  v_meta_consent BOOLEAN := NULL;
  v_final_consent BOOLEAN := NULL;
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
  -- CRITICAL SECURITY GATE: Unauthorized callers are halted immediately before any updates
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
  SELECT whatsapp_number, phone, phone_number, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF FOUND THEN
    v_raw_wa := NULLIF(TRIM(COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone_number, v_target_profile.phone)), '');
    v_profile_consent := v_target_profile.share_whatsapp_with_exchange;
  END IF;

  -- I. Inspect auth.users metadata ONLY when number or consent is missing from public.profiles
  IF v_raw_wa IS NULL OR v_profile_consent IS NULL THEN
    SELECT 
      NULLIF(TRIM(COALESCE(raw_user_meta_data->>'whatsapp_number', raw_user_meta_data->>'phone', raw_user_meta_data->>'phone_number')), ''),
      CASE 
        WHEN (raw_user_meta_data ? 'share_whatsapp_with_exchange') THEN (raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN
        ELSE NULL
      END
    INTO v_meta_wa, v_meta_consent
    FROM auth.users
    WHERE id = p_participant_id;

    IF v_raw_wa IS NULL AND v_meta_wa IS NOT NULL THEN
      v_raw_wa := v_meta_wa;
    END IF;
  END IF;

  -- J. Strict Opt-In Consent Resolution Hierarchy:
  -- 1. Profile consent is authoritative when explicitly set (whether TRUE or FALSE).
  -- 2. Metadata consent is inspected only when profile consent is genuinely NULL.
  -- 3. Unknown, unset, or missing consent is STRICTLY FALSE (opt-in privacy by default).
  -- 4. Entering a WhatsApp number NEVER automatically enables contact sharing.
  IF v_profile_consent IS NOT NULL THEN
    v_final_consent := v_profile_consent;
  ELSIF v_meta_consent IS NOT NULL THEN
    v_final_consent := v_meta_consent;
  ELSE
    v_final_consent := FALSE; -- Privacy by default: unknown consent is treated as disabled
  END IF;

  -- K. Self-healing fallback for public.profiles:
  -- If metadata had the number or explicit consent and public.profiles was missing them, persist safely.
  -- CRITICAL: Never overwrite existing non-null profile consent!
  IF v_meta_wa IS NOT NULL OR (v_profile_consent IS NULL AND v_meta_consent IS NOT NULL) THEN
    UPDATE public.profiles
    SET phone = COALESCE(public.profiles.phone, v_meta_wa),
        whatsapp_number = COALESCE(public.profiles.whatsapp_number, v_meta_wa),
        share_whatsapp_with_exchange = COALESCE(public.profiles.share_whatsapp_with_exchange, v_meta_consent, false),
        updated_at = pg_catalog.now()
    WHERE id = p_participant_id;
  END IF;

  -- L. Normalize Phone Digits
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

  -- M. Distinguish 4 explicit contact states:
  -- 1. Missing number: Target has not entered any number
  -- 2. Invalid number: Target has configured an invalid digit count (<10 or >15)
  -- 3. Sharing disabled: Target has opted out OR has unknown/disabled consent (v_final_consent IS NOT TRUE)
  -- 4. Sharing enabled: Target has valid number AND explicit consent IS TRUE
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
  ELSIF v_final_consent IS NOT TRUE THEN
    RETURN pg_catalog.jsonb_build_object(
      'participant_id', p_participant_id,
      'whatsapp', NULL,
      'has_whatsapp_consent', false,
      'contact_state', 'sharing_disabled',
      'notice', 'WhatsApp contact not shared by partner',
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

-- 2. Authoritative handle_new_user Trigger Function (Strict Opt-In)
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
  v_share_wa BOOLEAN;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', pg_catalog.split_part(NEW.email, '@', 1), 'GreenLoop Member');
  v_district := NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), '');
  v_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), '');

  -- Only enable contact sharing if explicitly opted in from signup metadata
  IF (NEW.raw_user_meta_data ? 'share_whatsapp_with_exchange') THEN
    v_share_wa := (NEW.raw_user_meta_data->>'share_whatsapp_with_exchange')::BOOLEAN;
  ELSE
    -- Privacy-by-default: entering a number without explicit consent leaves sharing disabled (false)
    v_share_wa := false;
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
    COALESCE(v_whatsapp, v_phone),
    v_share_wa,
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
    -- CRITICAL: Preserve explicit existing profile consent if already set (whether TRUE or FALSE)
    share_whatsapp_with_exchange = COALESCE(public.profiles.share_whatsapp_with_exchange, EXCLUDED.share_whatsapp_with_exchange, false),
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_verified END,
    updated_at = pg_catalog.now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Automatic Backfill & Self-Healing:
-- Note: The existing 'on_auth_user_created' trigger on auth.users already targets public.handle_new_user().
-- In PostgreSQL, replacing a function in place with CREATE OR REPLACE FUNCTION automatically updates the trigger
-- execution logic without requiring DROP TRIGGER / CREATE TRIGGER (avoiding auth schema privilege conflicts).
-- Backfill provider_id on any exchange_requests that have NULL provider_id
UPDATE public.exchange_requests er
SET provider_id = l.user_id
FROM public.listings l
WHERE er.listing_id = l.id
  AND er.provider_id IS NULL;
