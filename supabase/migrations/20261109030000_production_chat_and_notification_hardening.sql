-- ==============================================================================
-- Migration: 20261109030000_production_chat_and_notification_hardening.sql
-- Description: Final Production Security, Notification Deduplication & Handover Protection:
--              1. Remove completion code disclosure from ordinary notifications.
--                 - Secret handover verification codes are strictly withheld from notifications.
--                 - Accessible exclusively through authenticated handover dashboard.
--              2. Deduplicate notifications across exchange_requests and messages triggers:
--                 - notify_on_new_message skips initial proposals and system messages.
--                 - Guarantees exactly one notification per exchange request submission.
--              3. Harden caller identity and server execution boundaries:
--                 - Strict verification of authenticated client callers (auth.uid() = sender_id).
--                 - Explicitly restricted execution paths for trusted server operations.
--              4. Legacy-safe idempotency constraint application:
--                 - Non-destructive conflict resolution: clears duplicate proposal markers
--                   while preserving full message text, timestamps, and conversation threads.
--                 - Ensures uq_messages_exchange_request constraint is cleanly applied.
--
-- Rollback Strategy:
--   To safely revert without data loss:
--   1. Re-apply notify_exchange_request_event from 20261109000000.
--   2. Re-apply notify_on_new_message and validate_and_sync_message from 20261109020000.
--   All conversation rows, message histories, and exchange requests remain completely intact.
-- ==============================================================================

-- 1. Legacy Safe Conflict Resolution for Messages Before Ensuring Unique Constraint
DO $$
DECLARE
  v_dup_count INT := 0;
BEGIN
  -- If exchange_request_id column exists, safely resolve any duplicate references
  -- by nullifying exchange_request_id on secondary rows, preserving all messages intact
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'exchange_request_id'
  ) THEN
    WITH ranked_proposals AS (
      SELECT id, exchange_request_id,
             ROW_NUMBER() OVER (PARTITION BY exchange_request_id ORDER BY created_at ASC, id ASC) as rn
      FROM public.messages
      WHERE exchange_request_id IS NOT NULL
    )
    UPDATE public.messages m
    SET exchange_request_id = NULL
    FROM ranked_proposals rp
    WHERE m.id = rp.id AND rp.rn > 1;

    GET DIAGNOSTICS v_dup_count = ROW_COUNT;
    IF v_dup_count > 0 THEN
      RAISE NOTICE 'Preserved % duplicate proposal messages as standard conversation messages by clearing their proposal marker.', v_dup_count;
    END IF;
  ELSE
    ALTER TABLE public.messages
    ADD COLUMN exchange_request_id UUID REFERENCES public.exchange_requests(id) ON DELETE CASCADE;
  END IF;

  -- Ensure unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.messages'::regclass 
      AND conname IN ('uq_messages_exchange_request', 'messages_exchange_request_id_key')
  ) THEN
    BEGIN
      ALTER TABLE public.messages ADD CONSTRAINT uq_messages_exchange_request UNIQUE (exchange_request_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- 2. Remove Handover Verification Code Disclosure from Ordinary Notifications
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
      '/exchanges?req=' || NEW.id || '&chat=open',
      false,
      clock_timestamp()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      -- Event: Request Accepted -> notify requester WITHOUT disclosing secret completion code
      -- The verification pass code is kept confidential in the authorized handover view
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        NEW.requester_id,
        'Request Accepted',
        'Your request for "' || COALESCE(v_listing_title, 'material') || '" was accepted by the provider. Coordinate pickup details in chat and present your pass code at pickup.',
        'request',
        '/exchanges?req=' || NEW.id || '&chat=open',
        false,
        clock_timestamp()
      );
    ELSIF NEW.status = 'rejected' THEN
      -- Event: Request Declined -> notify requester
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (
        NEW.requester_id,
        'Request Declined',
        'Your request for "' || COALESCE(v_listing_title, 'material') || '" was declined by the provider.',
        'request',
        '/exchanges?req=' || NEW.id,
        false,
        clock_timestamp()
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
        clock_timestamp()
      );
    ELSIF NEW.status = 'completed' THEN
      -- Event: Completed Handover -> notify both provider and requester
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES
        (
          COALESCE(NEW.provider_id, v_provider_id),
          'Exchange Completed',
          'Handover verified! EcoPoints have been credited to your account for "' || COALESCE(v_listing_title, 'your listing') || '".',
          'points',
          '/impact',
          false,
          clock_timestamp()
        ),
        (
          NEW.requester_id,
          'Exchange Completed',
          'Handover verified! EcoPoints credited to your circular profile for collecting "' || COALESCE(v_listing_title, 'material') || '".',
          'points',
          '/impact',
          false,
          clock_timestamp()
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Notification Deduplication for Messages Trigger
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
  -- Deduplication: System messages, initial proposals, and exchange-linked messages
  -- must not generate duplicate notifications (notify_exchange_request_event already notifies provider)
  IF NEW.message_type IN ('system', 'proposal') OR NEW.exchange_request_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

  -- Resilient notification insertion: failure cannot abort or corrupt message transaction
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

-- 4. Hardened Message Identity & Server Execution Boundary
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

  -- 5. Anti-spoofing check with restricted execution boundaries
  IF v_role = 'authenticated' THEN
    IF v_caller IS NULL OR v_caller <> NEW.sender_id THEN
      RAISE EXCEPTION 'Sender identity spoofing prohibited: sender_id must match authenticated caller.';
    END IF;
  ELSIF v_role = 'anon' THEN
    RAISE EXCEPTION 'Anonymous message insertion is strictly prohibited.';
  ELSIF v_caller IS NOT NULL THEN
    IF v_caller <> NEW.sender_id THEN
      RAISE EXCEPTION 'Sender identity spoofing prohibited: sender_id must match authenticated caller.';
    END IF;
  ELSE
    -- Trusted server context:
    -- Verify that the executing database user is an authorized internal maintenance or admin role
    IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') AND 
       session_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
      RAISE EXCEPTION 'Unauthorized execution path for unauthenticated message insertion.';
    END IF;
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

