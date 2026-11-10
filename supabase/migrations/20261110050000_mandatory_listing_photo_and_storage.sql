-- ==============================================================================
-- GREENLOOP DATABASE MIGRATION
-- Migration: 20261110050000_mandatory_listing_photo_and_storage.sql
-- Description:
--   1. Enforces mandatory actual photographs on waste listings via database check constraint
--   2. Configures and hardens the Supabase Storage 'listing-images' bucket and RLS policies
-- ==============================================================================

-- 1. Ensure any legacy listings without images are flagged as demo so they don't block constraints
UPDATE public.listings
SET is_demo = true
WHERE (images IS NULL OR COALESCE(cardinality(images), 0) = 0);

-- 2. Add database check constraint enforcing at least 1 image on all non-demo listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_listings_mandatory_images'
  ) THEN
    ALTER TABLE public.listings
    ADD CONSTRAINT chk_listings_mandatory_images
    CHECK (
      is_demo = true OR
      COALESCE(cardinality(images), 0) >= 1
    );
  END IF;
END $$;

-- 3. Configure Supabase Storage 'listing-images' bucket if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Ensure bucket exists and has correct limits & public read access
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'listing-images',
      'listing-images',
      true,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  END IF;
END $$;

-- 4. Set up storage.objects RLS policies for 'listing-images' if storage.objects exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Enable RLS on storage.objects
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any to avoid duplication
    DROP POLICY IF EXISTS "Public select for listing-images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload listing-images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own listing-images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own listing-images" ON storage.objects;

    -- Public Read
    CREATE POLICY "Public select for listing-images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listing-images');

    -- Authenticated Upload
    CREATE POLICY "Authenticated users can upload listing-images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'listing-images');

    -- Authenticated Update
    CREATE POLICY "Users can update own listing-images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

    -- Authenticated Delete
    CREATE POLICY "Users can delete own listing-images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
