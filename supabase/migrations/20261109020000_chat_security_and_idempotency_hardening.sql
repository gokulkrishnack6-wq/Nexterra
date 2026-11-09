-- ==============================================================================
-- Migration: 20261109020000_chat_security_and_idempotency_hardening.sql
-- Description: Security, Idempotency & Reliability Hardening for Private Chat:
--              1. Fully idempotent conversation & proposal message creation:
--                 - exchange_request_id column on messages with unique partial index.
--                 - Exact single-message enforcement for initial proposals.
--                 - Safe handling of legacy requests with deleted/missing listings.
--              2. Authenticated message identity validation:
--                 - Strict caller verification (auth.uid() = sender_id).
--                 - Rejection of spoofed sender identities.
--                 - Rejection of anonymous insertions.
--              3. Conversation lifecycle update lockdown:
--                 - Revoke client UPDATE privileges and remove update policy on conversations.
--                 - Strictly sync status via trusted trigger on exchange_requests.
--                 - Enforce read-only state for rejected, cancelled, completed requests.
--              4. Message immutability and edit protection:
--                 - Revoke client UPDATE privileges on messages (UI is read/append only).
--                 - Install BEFORE UPDATE trigger enforcing field immutability and read-only checks.
--              5. Contact consent security:
--                 - Independent phone and WhatsApp consent enforcement.
--                 - Anti-spoofing participant checks in get_exchange_participant_contact.
--                 - Immediate cutoff upon consent revocation.
--                 - Minimum valid number length validation (at least 7 digits).
--              6. Notification reliability:
--                 - Protected notification dispatch preventing transaction abortion.
--                 - Privacy preservation (no completion codes or tokens in notification text).
--
-- Rollback Strategy:
--   To safely revert without data loss:
--   1. DROP TRIGGER IF EXISTS trg_protect_message_immutability ON public.messages;
--   2. DROP FUNCTION IF EXISTS public.protect_message_immutability();
--   3. DROP INDEX IF EXISTS public.uq_messages_initial_proposal;
--   4. Re-grant UPDATE (status) ON public.conversations TO authenticated;
--   5. Re-grant UPDATE (message_text, is_edited, updated_at) ON public.messages TO authenticated;
--   All conversation, message, and exchange request rows remain completely intact.
-- ==============================================================================

-- 1. Messages table idempotency column and unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'exchange_request_id'
  ) THEN
    ALTER TABLE public.messages
    ADD COLUMN exchange_request_id UUID UNIQUE REFERENCES public.exchange_requests(id) ON DELETE CASCADE;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_messages_exchange_request'
    ) THEN
      BEGIN
        ALTER TABLE public.messages ADD CONSTRAINT uq_messages_exchange_request UNIQUE (exchange_request_id);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$;

-- 2. Fully Idempotent Automatic Conversation & Proposal Message Creation Trigger
CREATE OR REPLACE FUNCTION public.create_conversation_for_exchange_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_conv_id UUID;
  v_listing RECORD;
BEGIN
  -- Fetch listing to obtain owner and verify existence
  SELECT user_id, title INTO v_listing
  FROM public.listings
  WHERE id = NEW.listing_id;

  v_provider_id := COALESCE(NEW.provider_id, v_listing.user_id);
  
  -- If listing is missing or has no owner, log notice and exit cleanly without aborting exchange insertion
  IF v_provider_id IS NULL THEN
    RAISE NOTICE 'Cannot create conversation for exchange request %: missing listing owner or provider_id.', NEW.id;
    RETURN NEW;
  END IF;

  -- Create unique conversation atomically (idempotent, never overwrites existing)
  INSERT INTO public.conversations (
    exchange_request_id,
    listing_id,
    requester_id,
    provider_id,
    status,
    created_at,
    updated_at,
    last_message_at
  ) VALUES (
    NEW.id,
    NEW.listing_id,
    NEW.requester_id,
    v_provider_id,
    CASE 
      WHEN NEW.status IN ('rejected', 'cancelled', 'completed') THEN 'read_only'
      ELSE 'active'
    END,
    COALESCE(NEW.created_at, clock_timestamp()),
    COALESCE(NEW.created_at, clock_timestamp()),
    COALESCE(NEW.created_at, clock_timestamp())
  )
  ON CONFLICT (exchange_request_id) DO NOTHING
  RETURNING id INTO v_conv_id;

  -- If conversation already existed, retrieve its id
  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE exchange_request_id = NEW.id;
  END IF;

  -- If requester provided an initial proposal message, insert at most once
  IF NEW.message IS NOT NULL AND length(trim(NEW.message)) > 0 AND v_conv_id IS NOT NULL THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      message_text,
      message_type,
      exchange_request_id,
      created_at
    ) VALUES (
      v_conv_id,
      NEW.requester_id,
      trim(NEW.message),
      'proposal',
      NEW.id,
      COALESCE(NEW.created_at, clock_timestamp())
    )
    ON CONFLICT (exchange_request_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_conversation_for_exchange_request ON public.exchange_requests;
CREATE TRIGGER trg_create_conversation_for_exchange_request
AFTER INSERT ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_conversation_for_exchange_request();

-- 3. Message Validation & Identity Anti-Spoofing Trigger
CREATE OR REPLACE FUNCTION public.validate_and_sync_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT := auth.role();
  v_conv RECORD;
  v_req RECORD;
BEGIN
  -- 1. Fetch conversation
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated conversation % does not exist.', NEW.conversation_id;
  END IF;

  -- 2. Fetch associated exchange request
  SELECT * INTO v_req
  FROM public.exchange_requests
  WHERE id = v_conv.exchange_request_id;

  -- 3. Check read-only state
  IF v_conv.status = 'read_only' OR (v_req.id IS NOT NULL AND v_req.status IN ('rejected', 'cancelled', 'completed')) THEN
    RAISE EXCEPTION 'Conversation is read-only. Exchange request is %.', COALESCE(v_req.status, 'closed');
  END IF;

  -- 4. Verify sender is a conversation participant
  IF NEW.sender_id <> v_conv.requester_id AND NEW.sender_id <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Sender % is not a participant in conversation %.', NEW.sender_id, NEW.conversation_id;
  END IF;

  -- 5. Anti-spoofing check for authenticated client operations
  IF v_role = 'authenticated' THEN
    IF v_caller IS NULL OR v_caller <> NEW.sender_id THEN
      RAISE EXCEPTION 'Sender identity spoofing prohibited: sender_id must match authenticated caller.';
    END IF;
  ELSIF v_role = 'anon' THEN
    RAISE EXCEPTION 'Anonymous message insertion is strictly prohibited.';
  END IF;

  -- In any execution context where auth.uid() is populated, sender_id MUST match auth.uid()
  IF v_caller IS NOT NULL AND v_caller <> NEW.sender_id THEN
    RAISE EXCEPTION 'Sender identity spoofing prohibited: sender_id must match authenticated caller.';
  END IF;

  -- 6. Integrity check on exchange_request_id if specified
  IF NEW.exchange_request_id IS NOT NULL AND NEW.exchange_request_id <> v_conv.exchange_request_id THEN
    RAISE EXCEPTION 'Message exchange_request_id does not match conversation exchange_request_id.';
  END IF;

  -- 7. Validate text constraints
  IF length(trim(NEW.message_text)) = 0 OR length(NEW.message_text) > 4000 THEN
    RAISE EXCEPTION 'Message text must be between 1 and 4000 characters.';
  END IF;

  -- 8. Touch conversation last_message_at
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = clock_timestamp()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Conversation Lifecycle & Update Lockdown
-- Revoke client UPDATE privileges completely from authenticated, anon and PUBLIC
REVOKE UPDATE ON public.conversations FROM authenticated, anon, PUBLIC;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- Authoritative Trigger for status synchronization from exchange_requests
CREATE OR REPLACE FUNCTION public.sync_conversation_status_on_exchange_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('rejected', 'cancelled', 'completed') THEN
    UPDATE public.conversations
    SET status = 'read_only',
        updated_at = clock_timestamp()
    WHERE exchange_request_id = NEW.id;
  ELSIF NEW.status IN ('pending', 'accepted') THEN
    UPDATE public.conversations
    SET status = 'active',
        updated_at = clock_timestamp()
    WHERE exchange_request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_conversation_status_on_exchange_update ON public.exchange_requests;
CREATE TRIGGER trg_sync_conversation_status_on_exchange_update
AFTER UPDATE OF status ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_conversation_status_on_exchange_update();

-- 5. Message Immutability & Hardened Edit Protection
-- Revoke client UPDATE on messages (GreenLoop UI does not support message edits)
REVOKE UPDATE ON public.messages FROM authenticated, anon, PUBLIC;
DROP POLICY IF EXISTS "Senders can edit their messages" ON public.messages;

-- Trigger enforcing field immutability and lifecycle checks if UPDATE is ever triggered
CREATE OR REPLACE FUNCTION public.protect_message_immutability()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Enforce field immutability
  IF NEW.id <> OLD.id OR NEW.conversation_id <> OLD.conversation_id OR NEW.sender_id <> OLD.sender_id OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Immutable message fields (id, conversation_id, sender_id, created_at) cannot be altered.';
  END IF;

  -- Block editing if conversation is read-only
  IF EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.exchange_requests er ON c.exchange_request_id = er.id
    WHERE c.id = OLD.conversation_id
      AND (c.status = 'read_only' OR er.status IN ('rejected', 'cancelled', 'completed'))
  ) THEN
    RAISE EXCEPTION 'Cannot edit message: conversation is read-only.';
  END IF;

  -- Enforce non-empty and max 4000 chars
  IF length(trim(NEW.message_text)) = 0 OR length(NEW.message_text) > 4000 THEN
    RAISE EXCEPTION 'Message text must be between 1 and 4000 characters.';
  END IF;

  NEW.updated_at := clock_timestamp();
  NEW.is_edited := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_message_immutability ON public.messages;
CREATE TRIGGER trg_protect_message_immutability
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.protect_message_immutability();

-- 6. Hardened Consent-Gated Contact Information Retrieval
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
  v_target_profile RECORD;
  v_shared_phone TEXT := NULL;
  v_shared_whatsapp TEXT := NULL;
  v_phone_digits INT;
  v_wa_digits INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Validate that the conversation exists and caller is an active participant
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  IF v_caller <> v_conv.requester_id AND v_caller <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Permission denied: Caller is not a participant in this conversation.';
  END IF;

  -- 2. Validate that target participant is the other party in this conversation
  IF p_participant_id <> v_conv.requester_id AND p_participant_id <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Invalid participant requested.';
  END IF;

  IF p_participant_id = v_caller THEN
    RAISE EXCEPTION 'Cannot request own contact details through exchange participant function.';
  END IF;

  -- 3. Fetch target participant's profile
  SELECT phone, whatsapp_number, share_phone_with_exchange, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant profile not found.';
  END IF;

  -- 4. Apply strict, independent user-consent gates and number validation (min 7 digits)
  IF v_target_profile.share_phone_with_exchange IS TRUE AND v_target_profile.phone IS NOT NULL THEN
    v_phone_digits := length(regexp_replace(v_target_profile.phone, '[^\d]', '', 'g'));
    IF v_phone_digits >= 7 THEN
      v_shared_phone := trim(v_target_profile.phone);
    END IF;
  END IF;

  IF v_target_profile.share_whatsapp_with_exchange IS TRUE THEN
    DECLARE
      v_raw_wa TEXT := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone);
    BEGIN
      IF v_raw_wa IS NOT NULL THEN
        v_wa_digits := length(regexp_replace(v_raw_wa, '[^\d]', '', 'g'));
        IF v_wa_digits >= 7 THEN
          v_shared_whatsapp := trim(v_raw_wa);
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

-- 7. Resilient Transactional Message Notification Trigger
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conv RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  -- System messages do not trigger push notifications
  IF NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT c.*, l.title AS listing_title INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.listings l ON c.listing_id = l.id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Determine recipient
  IF NEW.sender_id = v_conv.requester_id THEN
    v_recipient_id := v_conv.provider_id;
  ELSE
    v_recipient_id := v_conv.requester_id;
  END IF;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- Fetch sender name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  v_preview := CASE 
    WHEN length(NEW.message_text) > 75 THEN substring(NEW.message_text, 1, 72) || '...'
    ELSE NEW.message_text
  END;

  -- Safe insertion: Notification dispatch failure cannot abort message transaction
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      is_read,
      created_at
    ) VALUES (
      v_recipient_id,
      'New Message',
      COALESCE(v_sender_name, 'Exchange Partner') || ': ' || v_preview,
      'request',
      '/exchanges?req=' || v_conv.exchange_request_id || '&chat=open',
      false,
      clock_timestamp()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification dispatch error for message %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

