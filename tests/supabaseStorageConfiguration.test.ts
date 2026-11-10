// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import {
  validateWasteImageFile,
  parseStorageUploadError,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LISTING_IMAGES,
} from '../src/services/listingImageStorage';

describe('GreenLoop Supabase Storage Configuration & Error Handling Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. FILE VALIDATION & SIZE LIMITS
  // ============================================================================
  describe('1. File Format and Size Validation', () => {
    it('accepts JPG, JPEG, PNG, and WEBP formats up to 10 MB', () => {
      const jpg = new File(['content'], 'sample.jpg', { type: 'image/jpeg' });
      const jpeg = new File(['content'], 'sample.jpeg', { type: 'image/jpeg' });
      const png = new File(['content'], 'sample.png', { type: 'image/png' });
      const webp = new File(['content'], 'sample.webp', { type: 'image/webp' });

      expect(validateWasteImageFile(jpg).valid).toBe(true);
      expect(validateWasteImageFile(jpeg).valid).toBe(true);
      expect(validateWasteImageFile(png).valid).toBe(true);
      expect(validateWasteImageFile(webp).valid).toBe(true);
    });

    it('rejects unsupported file formats with actionable guidance', () => {
      const pdf = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const gif = new File(['content'], 'animation.gif', { type: 'image/gif' });
      const bmp = new File(['content'], 'bitmap.bmp', { type: 'image/bmp' });

      const pdfRes = validateWasteImageFile(pdf);
      expect(pdfRes.valid).toBe(false);
      expect(pdfRes.error).toContain('Unsupported image format');

      const gifRes = validateWasteImageFile(gif);
      expect(gifRes.valid).toBe(false);
      expect(gifRes.error).toContain('JPG, JPEG, PNG, or WEBP');

      const bmpRes = validateWasteImageFile(bmp);
      expect(bmpRes.valid).toBe(false);
    });

    it('enforces the 10 MB per-image limit strictly', () => {
      expect(MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);

      const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 1024); // 10MB + 1KB
      const oversizedFile = new File([oversizedBytes], 'huge.jpg', { type: 'image/jpeg' });

      const res = validateWasteImageFile(oversizedFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('10 MB limit');
    });
  });

  // ============================================================================
  // 2. ERROR PARSER & ACTIONABLE MESSAGING
  // ============================================================================
  describe('2. Meaningful Storage Error Parsing', () => {
    it('diagnoses "Bucket not found" and provides clear administrative instructions', () => {
      const errorObj = { message: 'Bucket not found', statusCode: '404' };
      const parsed = parseStorageUploadError(errorObj);

      expect(parsed).toContain("listing-images' storage bucket does not exist");
      expect(parsed).toContain('Supabase Dashboard Storage section');
      expect(parsed).not.toContain('check your connection');
    });

    it('diagnoses "NoSuchBucket" code from Supabase Storage API', () => {
      const errorObj = { code: 'NoSuchBucket', message: 'The resource was not found' };
      const parsed = parseStorageUploadError(errorObj);

      expect(parsed).toContain("listing-images' storage bucket does not exist");
    });

    it('diagnoses permission denied / RLS failure when user is not authorized', () => {
      const rlsError = { message: 'new row violates row-level security policy', code: '403' };
      const parsed = parseStorageUploadError(rlsError);

      expect(parsed).toContain('Upload permission denied');
      expect(parsed).toContain('must be signed in');
      expect(parsed).toContain('own account directory');
    });

    it('diagnoses payload too large / 413 error', () => {
      const sizeError = { message: 'Payload Too Large', statusCode: '413' };
      const parsed = parseStorageUploadError(sizeError);

      expect(parsed).toContain('10 MB limit');
    });

    it('diagnoses network connectivity failure', () => {
      const networkError = new TypeError('fetch failed');
      const parsed = parseStorageUploadError(networkError);

      expect(parsed).toContain('Network connection error');
      expect(parsed).toContain('internet connection');
    });

    it('diagnoses upload timeout', () => {
      const timeoutError = { message: 'Upload request timed out after 30s' };
      const parsed = parseStorageUploadError(timeoutError);

      expect(parsed).toContain('Upload timed out');
    });
  });

  // ============================================================================
  // 3. STORAGE SCHEMA, BUCKET & RLS POLICIES (PGLITE)
  // ============================================================================
  describe('3. PostgreSQL Storage Bucket & RLS Policy Integrity', () => {
    it('executes the storage migration cleanly and sets up bucket and policies', async () => {
      const db = new PGlite();

      // Create storage schema simulation matching Supabase Storage structure
      await db.exec(`
        CREATE SCHEMA IF NOT EXISTS storage;

        CREATE TABLE IF NOT EXISTS storage.buckets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          public BOOLEAN DEFAULT FALSE,
          avif_autodetection BOOLEAN DEFAULT FALSE,
          file_size_limit BIGINT,
          allowed_mime_types TEXT[]
        );

        CREATE TABLE IF NOT EXISTS storage.objects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bucket_id TEXT REFERENCES storage.buckets(id),
          name TEXT NOT NULL,
          owner UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
          metadata JSONB
        );

        -- Mock storage.foldername function
        CREATE OR REPLACE FUNCTION storage.foldername(name text)
        RETURNS text[] LANGUAGE plpgsql AS $$
        DECLARE
          parts text[];
        BEGIN
          parts := string_to_array(name, '/');
          IF array_length(parts, 1) > 1 THEN
            RETURN parts[1:array_length(parts, 1) - 1];
          ELSE
            RETURN ARRAY[]::text[];
          END IF;
        END;
        $$;

        -- Mock auth.uid() function
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
          SELECT current_setting('request.jwt.claim.sub', true)::uuid;
        $$ LANGUAGE sql STABLE;

        CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
          SELECT current_setting('request.jwt.claim.role', true);
        $$ LANGUAGE sql STABLE;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN;
          END IF;
        END $$;

        GRANT ALL ON SCHEMA storage TO anon, authenticated;
        GRANT ALL ON TABLE storage.objects TO anon, authenticated;
        GRANT ALL ON TABLE storage.buckets TO anon, authenticated;
      `);

      // Read and execute migration
      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110070000_storage_listing_images_bucket_and_policies.sql',
        'utf8'
      );

      await db.exec(migrationSql);

      // Verify bucket exists with correct configurations
      const bucketResult = await db.query<{
        id: string;
        name: string;
        public: boolean;
        file_size_limit: number;
        allowed_mime_types: string[];
      }>(`
        SELECT id, name, public, file_size_limit, allowed_mime_types
        FROM storage.buckets
        WHERE id = 'listing-images';
      `);

      expect(bucketResult.rows.length).toBe(1);
      const b = bucketResult.rows[0];
      expect(b.id).toBe('listing-images');
      expect(b.name).toBe('listing-images');
      expect(b.public).toBe(true);
      expect(Number(b.file_size_limit)).toBe(10485760); // 10MB
      expect(b.allowed_mime_types).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

      // Verify RLS policies on storage.objects
      const policyResult = await db.query<{ policyname: string; cmd: string }>(`
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        ORDER BY policyname;
      `);

      const policyNames = policyResult.rows.map((p) => p.policyname);
      expect(policyNames).toContain('Public select for listing-images');
      expect(policyNames).toContain('Authenticated users can upload listing-images');
      expect(policyNames).toContain('Users can update own listing-images');
      expect(policyNames).toContain('Users can delete own listing-images');

      // Test RLS Isolation:
      // 1. Anonymous user cannot insert
      await db.exec(`
        SET ROLE anon;
        SET "request.jwt.claim.sub" = '';
        SET "request.jwt.claim.role" = 'anon';
      `);

      let anonInsertFailed = false;
      try {
        await db.exec(`
          INSERT INTO storage.objects (bucket_id, name)
          VALUES ('listing-images', 'listings/user-1/photo.jpg');
        `);
      } catch (err: any) {
        anonInsertFailed = true;
      }
      expect(anonInsertFailed).toBe(true);

      // 2. Authenticated User A can insert into listings/user-a/
      const userAId = 'a1111111-1111-1111-1111-111111111111';
      const userBId = 'b2222222-2222-2222-2222-222222222222';

      await db.exec(`
        SET ROLE authenticated;
        SET "request.jwt.claim.sub" = '${userAId}';
        SET "request.jwt.claim.role" = 'authenticated';
      `);

      await db.exec(`
        INSERT INTO storage.objects (bucket_id, name)
        VALUES ('listing-images', 'listings/${userAId}/waste-item-1.jpg');
      `);

      // 3. User A cannot insert into User B's directory
      let spoofInsertFailed = false;
      try {
        await db.exec(`
          INSERT INTO storage.objects (bucket_id, name)
          VALUES ('listing-images', 'listings/${userBId}/spoofed.jpg');
        `);
      } catch (err: any) {
        spoofInsertFailed = true;
      }
      expect(spoofInsertFailed).toBe(true);

      // 4. User B cannot delete User A's file
      await db.exec(`
        SET ROLE authenticated;
        SET "request.jwt.claim.sub" = '${userBId}';
        SET "request.jwt.claim.role" = 'authenticated';
      `);

      await db.exec(`
        DELETE FROM storage.objects
        WHERE bucket_id = 'listing-images' AND name = 'listings/${userAId}/waste-item-1.jpg';
      `);

      // Verify file still exists (not deleted by User B)
      const checkFile = await db.query(`
        SELECT count(*) FROM storage.objects
        WHERE bucket_id = 'listing-images' AND name = 'listings/${userAId}/waste-item-1.jpg';
      `);
      expect(Number(checkFile.rows[0].count)).toBe(1);

      // 5. User A can delete own file
      await db.exec(`
        SET ROLE authenticated;
        SET "request.jwt.claim.sub" = '${userAId}';
        SET "request.jwt.claim.role" = 'authenticated';
      `);

      await db.exec(`
        DELETE FROM storage.objects
        WHERE bucket_id = 'listing-images' AND name = 'listings/${userAId}/waste-item-1.jpg';
      `);

      const checkFileDeleted = await db.query(`
        SELECT count(*) FROM storage.objects
        WHERE bucket_id = 'listing-images' AND name = 'listings/${userAId}/waste-item-1.jpg';
      `);
      expect(Number(checkFileDeleted.rows[0].count)).toBe(0);

      // 6. Test Idempotency: Running migration second time executes cleanly
      await db.exec(`RESET ROLE;`);
      await db.exec(migrationSql);
    }, 30000);
  });
});

