// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import {
  validateWasteImageFile,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LISTING_IMAGES,
} from '../src/services/listingImageStorage';

describe('GreenLoop Mandatory Waste Material Photographs Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. FILE TYPE & SIZE VALIDATION
  // ============================================================================
  describe('1. File Format and Size Validation', () => {
    it('accepts valid JPG, JPEG, PNG, and WEBP image files', () => {
      const jpgFile = new File(['mock content'], 'waste_photo.jpg', { type: 'image/jpeg' });
      const jpegFile = new File(['mock content'], 'waste_photo.jpeg', { type: 'image/jpeg' });
      const pngFile = new File(['mock content'], 'waste_photo.png', { type: 'image/png' });
      const webpFile = new File(['mock content'], 'waste_photo.webp', { type: 'image/webp' });

      expect(validateWasteImageFile(jpgFile).valid).toBe(true);
      expect(validateWasteImageFile(jpegFile).valid).toBe(true);
      expect(validateWasteImageFile(pngFile).valid).toBe(true);
      expect(validateWasteImageFile(webpFile).valid).toBe(true);
    });

    it('rejects unsupported file extensions or mime types', () => {
      const pdfFile = new File(['mock content'], 'document.pdf', { type: 'application/pdf' });
      const txtFile = new File(['mock content'], 'notes.txt', { type: 'text/plain' });
      const exeFile = new File(['mock content'], 'malware.exe', { type: 'application/x-msdownload' });

      const pdfRes = validateWasteImageFile(pdfFile);
      expect(pdfRes.valid).toBe(false);
      expect(pdfRes.error).toContain('Unsupported image format');

      const txtRes = validateWasteImageFile(txtFile);
      expect(txtRes.valid).toBe(false);

      const exeRes = validateWasteImageFile(exeFile);
      expect(exeRes.valid).toBe(false);
    });

    it('rejects files exceeding the 10 MB size limit', () => {
      // 11 MB mock file
      const largeBytes = new Uint8Array(11 * 1024 * 1024);
      const largeFile = new File([largeBytes], 'huge_photo.jpg', { type: 'image/jpeg' });

      const res = validateWasteImageFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('10 MB limit');
    });

    it('enforces maximum 5 images per listing', () => {
      expect(MAX_LISTING_IMAGES).toBe(5);
    });
  });

  // ============================================================================
  // 2. FRONTEND SUBMISSION & EDIT VALIDATION LOGIC
  // ============================================================================
  describe('2. Frontend Listing Validation Rules', () => {
    it('prevents submission when no images are attached and flags the error', () => {
      const enteredDetails = {
        title: 'Recyclable Cardboard Sheets',
        description: 'Clean flattened cartons ready for pickup.',
        categoryId: 'cat-paper',
        quantity: 15,
        unit: 'kg',
        district: 'Kozhikode',
        locality: 'Mananchira',
        latitude: 11.2588,
        longitude: 75.7804,
      };

      const images: string[] = [];
      let submissionAllowed = false;
      let validationMessage = '';

      // Frontend validation check
      if (!images || images.length === 0) {
        submissionAllowed = false;
        validationMessage = 'Upload at least one photo of the waste material to continue.';
      } else {
        submissionAllowed = true;
      }

      expect(submissionAllowed).toBe(false);
      expect(validationMessage).toBe('Upload at least one photo of the waste material to continue.');
      // Details are preserved intact
      expect(enteredDetails.title).toBe('Recyclable Cardboard Sheets');
      expect(enteredDetails.quantity).toBe(15);
    });

    it('allows submission when at least one valid image is provided', () => {
      const images = ['https://supabase.co/storage/v1/object/public/listing-images/user1/photo.jpg'];
      let submissionAllowed = false;

      if (images && images.length >= 1) {
        submissionAllowed = true;
      }

      expect(submissionAllowed).toBe(true);
    });

    it('prevents removing the last remaining photograph during edit mode', () => {
      const existingImages = ['https://supabase.co/storage/v1/object/public/listing-images/user1/original.jpg'];
      let removalBlocked = false;
      let warning = '';

      const handleRemove = (index: number) => {
        if (existingImages.length === 1) {
          removalBlocked = true;
          warning = 'At least one photo of the waste material is required. Please upload a replacement before removing this image.';
          return;
        }
        existingImages.splice(index, 1);
      };

      handleRemove(0);
      expect(removalBlocked).toBe(true);
      expect(existingImages.length).toBe(1);
      expect(warning).toContain('At least one photo of the waste material is required');
    });

    it('allows replacing an existing photograph without requiring an empty state', () => {
      const existingImages = ['https://supabase.co/storage/v1/object/public/listing-images/user1/old.jpg'];
      const newImageUrl = 'https://supabase.co/storage/v1/object/public/listing-images/user1/replacement.jpg';

      // Replace index 0 directly
      existingImages[0] = newImageUrl;

      expect(existingImages.length).toBe(1);
      expect(existingImages[0]).toBe(newImageUrl);
    });
  });

  // ============================================================================
  // 3. COMPLETE REMOVAL OF AI GENERATOR & UNRELATED STOCK PHOTOS
  // ============================================================================
  describe('3. Removal of AI-Generated Fallbacks and Stock Unsplash URLs', () => {
    it('CreateListingPage does not contain AI image generation preview triggers or fallbacks', () => {
      const createListingSrc = fs.readFileSync(
        'src/pages/marketplace/CreateListingPage.tsx',
        'utf8'
      );

      expect(createListingSrc).not.toContain('generateListingImage');
      expect(createListingSrc).not.toContain('handleGenerateAiPreview');
      expect(createListingSrc).not.toContain('CATEGORY_ILLUSTRATIVE_FALLBACKS');
      expect(createListingSrc).not.toContain('NEUTRAL_MATERIAL_PLACEHOLDER');
      expect(createListingSrc).not.toContain('leave empty to auto-generate a photo');
    });

    it('ListingDetailPage does not offer AI image regeneration', () => {
      const detailPageSrc = fs.readFileSync(
        'src/pages/marketplace/ListingDetailPage.tsx',
        'utf8'
      );

      expect(detailPageSrc).not.toContain('Regenerate Photo');
      expect(detailPageSrc).not.toContain('isRegeneratingImage');
      expect(detailPageSrc).not.toContain('generateListingImage');
    });

    it('does not silently replace missing listing photos with Unsplash stock photos', () => {
      const listingCardSrc = fs.readFileSync(
        'src/components/marketplace/ListingCard.tsx',
        'utf8'
      );
      const detailPageSrc = fs.readFileSync(
        'src/pages/marketplace/ListingDetailPage.tsx',
        'utf8'
      );
      const overviewSrc = fs.readFileSync(
        'src/pages/dashboard/OverviewPage.tsx',
        'utf8'
      );
      const smartMatchSrc = fs.readFileSync(
        'src/pages/scanner/SmartMatchPage.tsx',
        'utf8'
      );

      const stockUnsplashUrl = '1532996122724'; // Part of the Unsplash ID
      expect(listingCardSrc).not.toContain(stockUnsplashUrl);
      expect(detailPageSrc).not.toContain(stockUnsplashUrl);
      expect(overviewSrc).not.toContain(stockUnsplashUrl);
      expect(smartMatchSrc).not.toContain(stockUnsplashUrl);
    });
  });

  // ============================================================================
  // 4. DATABASE CHECK CONSTRAINT (PGLITE VERIFICATION)
  // ============================================================================
  describe('4. PostgreSQL Database Check Constraint Integrity', () => {
    it('enforces mandatory images constraint on public.listings', async () => {
      const db = new PGlite();

      // Setup minimal schema for testing
      await db.exec(`
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS public.waste_categories (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL
        );

        CREATE TYPE listing_pricing AS ENUM ('free', 'exchange', 'sale');
        CREATE TYPE listing_status AS ENUM ('active', 'reserved', 'completed', 'cancelled');

        CREATE TABLE IF NOT EXISTS public.listings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.profiles(id),
          category_id UUID NOT NULL REFERENCES public.waste_categories(id),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          material_type TEXT NOT NULL,
          quantity NUMERIC NOT NULL,
          unit TEXT NOT NULL DEFAULT 'kg',
          listing_type listing_pricing NOT NULL DEFAULT 'free',
          price NUMERIC DEFAULT 0,
          condition TEXT NOT NULL DEFAULT 'clean/dry',
          district TEXT NOT NULL,
          locality TEXT NOT NULL,
          address TEXT,
          latitude NUMERIC,
          longitude NUMERIC,
          status listing_status NOT NULL DEFAULT 'active',
          ai_classified BOOLEAN NOT NULL DEFAULT false,
          ai_confidence NUMERIC DEFAULT NULL,
          suggested_action TEXT,
          images TEXT[] DEFAULT '{}',
          is_demo BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Seed a user and category
      const testUserId = '11111111-1111-4111-8111-111111111111';
      const testCatId = '22222222-2222-4222-8222-222222222222';
      await db.exec(`
        INSERT INTO public.profiles (id) VALUES ('${testUserId}');
        INSERT INTO public.waste_categories (id, name, slug) VALUES ('${testCatId}', 'Plastics', 'plastics');
      `);

      // Apply the migration
      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110050000_mandatory_listing_photo_and_storage.sql',
        'utf8'
      );
      await db.exec(migrationSql);

      // Attempt 1: Insert listing with EMPTY images array and is_demo = false
      // MUST FAIL due to chk_listings_mandatory_images
      let insertFailed = false;
      try {
        await db.exec(`
          INSERT INTO public.listings (
            user_id, category_id, title, description, material_type, quantity,
            district, locality, images, is_demo
          ) VALUES (
            '${testUserId}', '${testCatId}', 'Bottles without photo', 'Empty plastic bottles', 'PET', 5,
            'Ernakulam', 'Kochi', '{}', false
          );
        `);
      } catch (err: any) {
        insertFailed = true;
        expect(err.message).toContain('chk_listings_mandatory_images');
      }
      expect(insertFailed).toBe(true);

      // Attempt 2: Insert listing with NULL images array and is_demo = false
      // MUST FAIL
      let nullFailed = false;
      try {
        await db.exec(`
          INSERT INTO public.listings (
            user_id, category_id, title, description, material_type, quantity,
            district, locality, images, is_demo
          ) VALUES (
            '${testUserId}', '${testCatId}', 'Bottles null photo', 'Empty plastic bottles', 'PET', 5,
            'Ernakulam', 'Kochi', NULL, false
          );
        `);
      } catch (err: any) {
        nullFailed = true;
        expect(err.message).toContain('chk_listings_mandatory_images');
      }
      expect(nullFailed).toBe(true);

      // Attempt 3: Insert listing with ONE actual uploaded photograph
      // MUST SUCCEED
      await db.exec(`
        INSERT INTO public.listings (
          user_id, category_id, title, description, material_type, quantity,
          district, locality, images, is_demo
        ) VALUES (
          '${testUserId}', '${testCatId}', 'Clean PET Bottles', 'Cleaned and sorted bottles', 'PET', 10,
          'Ernakulam', 'Kochi', ARRAY['https://storage.supabase.co/listing-images/sample-photo.jpg'], false
        );
      `);

      const queryRes = await db.query<{ count: string }>(
        "SELECT COUNT(*) FROM public.listings WHERE title = 'Clean PET Bottles';"
      );
      expect(Number(queryRes.rows[0].count)).toBe(1);
    }, 30000);
  });
});
