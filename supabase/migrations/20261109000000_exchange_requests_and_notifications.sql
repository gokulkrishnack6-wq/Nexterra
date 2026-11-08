-- ==============================================================================
-- Migration: 20261109000000_exchange_requests_and_notifications.sql
-- Description: Waste Request delivery & visibility: Adds provider_id, indexes,
--              triggers, robust RLS policies, and automated event notifications.
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

  -- Ensure updated_at is populated
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_exchange_request_provider ON public.exchange_requests;
CREATE TRIGGER trg_set_exchange_request_provider
BEFORE INSERT ON public.exchange_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_exchange_request_provider();

-- 5. Row Level Security Policies for exchange_requests
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

-- UPDATE: Requesters can cancel; Providers can accept or reject
CREATE POLICY "Parties can update their exchange requests" ON public.exchange_requests
FOR UPDATE USING (
  auth.uid() = requester_id OR 
  auth.uid() = provider_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

-- 6. Notifications RLS and Automated Event Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Automated notification trigger on exchange request lifecycle events
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
