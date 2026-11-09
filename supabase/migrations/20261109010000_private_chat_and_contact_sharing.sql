-- ==============================================================================
-- Migration: 20261109010000_private_chat_and_contact_sharing.sql
-- Description: Private Chat & Communication System for Waste Exchanges:
--              - conversations and messages tables with indexes and cascades
--              - Automatic conversation creation on exchange request submission
--              - Message validation trigger enforcing role and read-only lifecycle
--              - Transactional notification generation on new messages
--              - User-controlled contact sharing (Phone & WhatsApp) with consent gates
--              - Full RLS and privilege lockdown for participant privacy
-- Security:
--   - Explicit SET search_path = public, pg_temp on all SECURITY DEFINER functions.
--   - Schema-qualified object references.
--   - Client INSERT on conversations revoked (trigger-only creation).
--   - Messages RLS restricts SELECT and INSERT strictly to exchange participants.
--   - Anonymous access revoked across conversations and messages.
-- ==============================================================================

-- 1. Profiles contact sharing columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS share_phone_with_exchange BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS share_whatsapp_with_exchange BOOLEAN NOT NULL DEFAULT false;

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_request_id UUID UNIQUE NOT NULL REFERENCES public.exchange_requests(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_conversation_exchange UNIQUE (exchange_request_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_exchange ON public.conversations(exchange_request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_requester ON public.conversations(requester_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider ON public.conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL CHECK (length(trim(message_text)) > 0 AND length(message_text) <= 4000),
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 4. Authoritative Trigger: Automatic Conversation Creation on Exchange Request Insert
CREATE OR REPLACE FUNCTION public.create_conversation_for_exchange_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_conv_id UUID;
BEGIN
  -- Authoritative provider derivation
  v_provider_id := COALESCE(NEW.provider_id, (SELECT user_id FROM public.listings WHERE id = NEW.listing_id));
  
  IF v_provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create unique conversation atomically
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
    'active',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (exchange_request_id) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO v_conv_id;

  -- If the requester supplied an initial proposal message, insert it as the initial chat message
  IF NEW.message IS NOT NULL AND length(trim(NEW.message)) > 0 AND v_conv_id IS NOT NULL THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      message_text,
      message_type,
      created_at
    ) VALUES (
      v_conv_id,
      NEW.requester_id,
      trim(NEW.message),
      'text',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_conversation_for_exchange_request ON public.exchange_requests;
CREATE TRIGGER trg_create_conversation_for_exchange_request
AFTER INSERT ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_conversation_for_exchange_request();

-- 5. Safe Backfill for any Existing Exchange Requests
DO $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO public.conversations (
    exchange_request_id,
    listing_id,
    requester_id,
    provider_id,
    status,
    created_at,
    updated_at,
    last_message_at
  )
  SELECT 
    er.id,
    er.listing_id,
    er.requester_id,
    COALESCE(er.provider_id, l.user_id),
    CASE 
      WHEN er.status IN ('rejected', 'cancelled', 'completed') THEN 'read_only'
      ELSE 'active'
    END,
    er.created_at,
    er.updated_at,
    er.updated_at
  FROM public.exchange_requests er
  JOIN public.listings l ON er.listing_id = l.id
  WHERE l.user_id IS NOT NULL
  ON CONFLICT (exchange_request_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % conversations for existing exchange requests.', v_count;
END $$;

-- 6. Trigger: Message Validation, Participant Authorization, and Status Enforcement
CREATE OR REPLACE FUNCTION public.validate_and_sync_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
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

  -- 2. Fetch associated exchange request status
  SELECT * INTO v_req
  FROM public.exchange_requests
  WHERE id = v_conv.exchange_request_id;

  IF FOUND AND v_req.status IN ('rejected', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Conversation is read-only. Exchange request is %.', v_req.status;
  END IF;

  -- 3. Verify sender is a conversation participant
  IF NEW.sender_id <> v_conv.requester_id AND NEW.sender_id <> v_conv.provider_id THEN
    RAISE EXCEPTION 'Sender % is not a participant in conversation %.', NEW.sender_id, NEW.conversation_id;
  END IF;

  -- 4. If invoked by an authenticated client, verify sender_id matches auth.uid()
  IF v_caller IS NOT NULL AND v_caller <> NEW.sender_id THEN
    RAISE EXCEPTION 'Impersonation prevented: sender_id must match authenticated user.';
  END IF;

  -- 5. Touch conversation last_message_at
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_and_sync_message ON public.messages;
CREATE TRIGGER trg_validate_and_sync_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_sync_message();

-- 7. Trigger: Transactional Message Notifications
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conv RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT c.*, l.title AS listing_title INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.listings l ON c.listing_id = l.id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = v_conv.requester_id THEN
    v_recipient_id := v_conv.provider_id;
  ELSE
    v_recipient_id := v_conv.requester_id;
  END IF;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch sender name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Insert transactional notification for recipient
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
    COALESCE(v_sender_name, 'Exchange Partner') || ': ' || 
      CASE 
        WHEN length(NEW.message_text) > 75 THEN substring(NEW.message_text, 1, 72) || '...'
        ELSE NEW.message_text
      END,
    'request',
    '/exchanges?req=' || v_conv.exchange_request_id || '&chat=open',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();

-- 8. Trigger: Synchronize Conversation Status on Exchange Request Transition
CREATE OR REPLACE FUNCTION public.sync_conversation_status_on_exchange_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('rejected', 'cancelled', 'completed') THEN
    UPDATE public.conversations
    SET status = 'read_only',
        updated_at = NOW()
    WHERE exchange_request_id = NEW.id;
  ELSIF NEW.status IN ('pending', 'accepted') THEN
    UPDATE public.conversations
    SET status = 'active',
        updated_at = NOW()
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

-- 9. Consent-Gated Contact Information Retrieval Function
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
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Validate that the conversation exists and the caller is an active participant
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

  -- 3. Fetch target participant's profile
  SELECT phone, whatsapp_number, share_phone_with_exchange, share_whatsapp_with_exchange
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant profile not found.';
  END IF;

  -- 4. Apply strict user-consent gate
  IF v_target_profile.share_phone_with_exchange IS TRUE THEN
    v_shared_phone := v_target_profile.phone;
  END IF;

  IF v_target_profile.share_whatsapp_with_exchange IS TRUE THEN
    v_shared_whatsapp := COALESCE(v_target_profile.whatsapp_number, v_target_profile.phone);
  END IF;

  RETURN jsonb_build_object(
    'participant_id', p_participant_id,
    'phone', v_shared_phone,
    'whatsapp', v_shared_whatsapp,
    'has_phone_consent', COALESCE(v_target_profile.share_phone_with_exchange, false),
    'has_whatsapp_consent', COALESCE(v_target_profile.share_whatsapp_with_exchange, false)
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Row Level Security & Privilege Lockdown

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

CREATE POLICY "Participants can view conversations" ON public.conversations
FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = provider_id
);

CREATE POLICY "Participants can update conversations" ON public.conversations
FOR UPDATE USING (
  auth.uid() = requester_id OR auth.uid() = provider_id
);

REVOKE ALL ON public.conversations FROM PUBLIC, anon;
GRANT SELECT, UPDATE (status) ON public.conversations TO authenticated;
REVOKE INSERT, DELETE ON public.conversations FROM authenticated;

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can edit their messages" ON public.messages;

CREATE POLICY "Participants can view messages" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
      AND (c.requester_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Participants can insert messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
      AND (c.requester_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

CREATE POLICY "Senders can edit their messages" ON public.messages
FOR UPDATE USING (
  auth.uid() = sender_id
) WITH CHECK (
  auth.uid() = sender_id
);

REVOKE ALL ON public.messages FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE (message_text, is_edited, updated_at) ON public.messages TO authenticated;
REVOKE DELETE ON public.messages FROM authenticated;

-- Function Grant
GRANT EXECUTE ON FUNCTION public.get_exchange_participant_contact(UUID, UUID) TO authenticated;

-- 11. Realtime Publication Attachment
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

