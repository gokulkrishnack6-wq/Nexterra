-- ==============================================================================
-- GREENLOOP: ENVIRONMENTAL REPORTS HARDENING & 'OTHER' ISSUE TYPE SUPPORT
-- Migration: 20261110040000_other_environmental_issue_reports.sql
-- ==============================================================================

-- 1. Extend reported_item_type CHECK constraint on public.reports to support
--    civic incident reports ('environmental_issue') alongside existing types.
DO $$
BEGIN
  ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_item_type_check;
  ALTER TABLE public.reports ADD CONSTRAINT reports_reported_item_type_check 
    CHECK (reported_item_type IN ('listing', 'user', 'centre', 'location', 'public_bin', 'collection_centre', 'environmental_issue'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Add optional other_description and issue_type columns to public.reports
--    for explicit relational access alongside the structured JSON details payload.
DO $$
BEGIN
  ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS other_description TEXT;
  ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS issue_type TEXT;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Ensure RLS policies on public.reports are enabled and idempotent
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'reports' 
      AND policyname = 'Authenticated users can submit reports'
  ) THEN
    CREATE POLICY "Authenticated users can submit reports" ON public.reports
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'reports' 
      AND policyname = 'Reporters can view own reports'
  ) THEN
    CREATE POLICY "Reporters can view own reports" ON public.reports
      FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
END $$;

