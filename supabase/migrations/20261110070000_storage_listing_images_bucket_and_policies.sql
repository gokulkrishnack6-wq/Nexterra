-- ==============================================================================
-- GREENLOOP SUPABASE STORAGE CONFIGURATION & RLS POLICIES
-- Migration: 20261110070000_storage_listing_images_bucket_and_policies.sql
-- Description:
--   1. Creates or updates the public 'listing-images' bucket with 10MB limit
--      and supported image MIME types (JPEG, PNG, WEBP).
--   2. Enables Row-Level Security on storage.objects.
--   3. Sets up RLS policies:
--      - Public read access for marketplace listing viewers
--      - Authenticated upload restricted to user's own folder
--      - Owner update and delete policies
-- ==============================================================================

-- Ensure Supabase standard auth roles exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- 1. Create or configure 'listing-images' bucket in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  10485760, -- 10MB in bytes (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

-- 3. Drop existing policies on 'listing-images' to ensure clean, repeatable idempotency
DROP POLICY IF EXISTS "Public select for listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing-images" ON storage.objects;

-- 4. Policy: Public Read Access
-- Allows any user or visitor to view waste listing photographs in the marketplace
CREATE POLICY "Public select for listing-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- 5. Policy: Authenticated User Upload
-- Allows authenticated users to upload into either listings/{user_id}/... or {user_id}/...
CREATE POLICY "Authenticated users can upload listing-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- 6. Policy: Owner Update
-- Users can only modify their own uploaded photographs
CREATE POLICY "Users can update own listing-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- 7. Policy: Owner Delete
-- Users can only delete their own uploaded photographs
CREATE POLICY "Users can delete own listing-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

