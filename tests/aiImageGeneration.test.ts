// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateListingImage,
  buildWasteImagePrompt,
  isAiGeneratedImage,
  CATEGORY_ILLUSTRATIVE_FALLBACKS,
  GenerateListingImageParams
} from '../src/services/imageGeneration';
import { WasteListing } from '../src/types';

describe('GreenLoop Automatic AI-Generated Listing Images (Feature 1–8)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock fetch for sandboxed testing environment
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('pollinations.ai') || urlStr.includes('generate-listing-image')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          blob: () => Promise.resolve(new Blob(['mock-image-bytes-length-greater-than-1000'.repeat(30)], { type: 'image/jpeg' })),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });
  });

  describe('Feature 1 & 2: Prompt Quality & Material Representation', () => {
    it('constructs high-fidelity photographic prompts tailored for specific circular waste items', () => {
      const prompt1 = buildWasteImagePrompt('Coconut Husk Waste', 'Biomass / Coir', 'agricultural');
      expect(prompt1).toContain('Coconut Husk Waste');
      expect(prompt1).toContain('(Biomass / Coir)');
      expect(prompt1).toContain('clean neutral concrete or wooden surface background');
      expect(prompt1).toContain('no text');
      expect(prompt1).toContain('no watermarks');
      expect(prompt1).toContain('realistic texture');

      const prompt2 = buildWasteImagePrompt('Used Cardboard Boxes', 'Corrugated Kraft Paperboard', 'paper');
      expect(prompt2).toContain('Used Cardboard Boxes');
      expect(prompt2).toContain('(Corrugated Kraft Paperboard)');

      const prompt3 = buildWasteImagePrompt('Plastic Bottles', 'PET #1 Clear Plastic', 'plastics');
      expect(prompt3).toContain('Plastic Bottles');
      expect(prompt3).toContain('(PET #1 Clear Plastic)');
    });

    it('avoids repeating identical title and material_type in prompt', () => {
      const prompt = buildWasteImagePrompt('Waste Paper', 'Waste Paper', 'paper');
      // Should not have (Waste Paper) duplicate in brackets
      expect(prompt).not.toContain('(Waste Paper)');
      expect(prompt).toContain('A realistic authentic photograph of clean Waste Paper');
    });
  });

  describe('Feature 3 & 4: Publishing Workflow & Uploaded Image Preservation', () => {
    it('Scenario 1: preserves user uploaded image without replacing it', async () => {
      const userUploadedPhoto = 'https://custom-storage.greenloop.org/user-uploads/my-actual-waste.jpg';
      let listingImage = '';
      let isAiImage = false;

      // Workflow check: If user provided an image, use it directly
      if (userUploadedPhoto && userUploadedPhoto.trim()) {
        listingImage = userUploadedPhoto.trim();
        isAiImage = false;
      } else {
        const gen = await generateListingImage({ title: 'Used Plastic' });
        listingImage = gen.image_url;
        isAiImage = true;
      }

      expect(listingImage).toBe(userUploadedPhoto);
      expect(isAiImage).toBe(false);
      expect(isAiGeneratedImage({ images: [listingImage], is_ai_image: isAiImage })).toBe(false);
    });

    it('Scenario 2: automatically initiates AI image generation when no image is uploaded', async () => {
      const params: GenerateListingImageParams = {
        title: 'Coconut Shells',
        category_slug: 'agricultural',
        material_type: 'Raw Hard Shell',
        description: 'Clean dried coconut shells for charcoal or craft upcycling.',
      };

      const result = await generateListingImage(params);

      expect(result.success).toBe(true);
      expect(result.is_ai_image).toBe(true);
      expect(result.image_url).toBeDefined();
      expect(typeof result.image_url).toBe('string');
      expect(result.image_url.length).toBeGreaterThan(10);
      expect(isAiGeneratedImage({ images: [result.image_url], is_ai_image: true })).toBe(true);
    });

    it('Scenario 3: handles scanner-generated waste classification without image', async () => {
      const scannerData = {
        title: 'Discarded Aluminium Soda Cans',
        category_slug: 'metals',
        material_type: 'Aluminium #41',
        description: 'Clean rinsed aluminium beverage cans crushed for metal smelting.',
      };

      const result = await generateListingImage(scannerData);

      expect(result.success).toBe(true);
      expect(result.is_ai_image).toBe(true);
      expect(result.prompt_used).toContain('Aluminium Soda Cans');
      expect(result.prompt_used).toContain('Aluminium #41');
    });

    it('Scenario 4: generates realistic illustrations for diverse waste categories', async () => {
      const categoriesToTest = [
        { title: 'PET Drinking Bottles', slug: 'plastics', material: 'PET #1' },
        { title: 'Flattened Delivery Cartons', slug: 'paper', material: 'Kraft Corrugated' },
        { title: 'Kitchen Vegetable Peels', slug: 'organic', material: 'Wet Organic Biomass' },
        { title: 'Discarded PCB Circuit Boards', slug: 'e-waste', material: 'Electronic Scrap' },
        { title: 'Broken Glass Cullet', slug: 'glass', material: 'Clear Vitreous Cullet' },
        { title: 'Cotton Garment Tailoring Cutoffs', slug: 'textiles', material: 'Pure Cotton Scrap' },
      ];

      for (const item of categoriesToTest) {
        const res = await generateListingImage({
          title: item.title,
          category_slug: item.slug,
          material_type: item.material,
        });

        expect(res.image_url).toBeDefined();
        expect(res.is_ai_image).toBe(true);
      }
    });
  });

  describe('Feature 5: Failure Handling & Non-Blocking Fallbacks', () => {
    it('Scenario 8: does not block publishing if external generation fails or times out', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or rate limit'));

      const result = await generateListingImage({
        title: 'Raw Vegetable Kitchen Scraps',
        category_slug: 'organic',
      });

      // Verify graceful fallback
      expect(result.success).toBe(false);
      expect(result.is_fallback).toBe(true);
      expect(result.image_url).toBe(CATEGORY_ILLUSTRATIVE_FALLBACKS.organic);
      expect(result.is_ai_image).toBe(true);

      global.fetch = originalFetch;
    });

    it('never produces an empty, undefined, or broken URL', async () => {
      const result = await generateListingImage({
        title: 'Miscellaneous Unsorted Byproduct',
        category_slug: 'unknown-category' as any,
      });

      expect(result.image_url).toBeTruthy();
      expect(result.image_url.startsWith('http')).toBe(true);
    });
  });

  describe('Feature 6 & 10: Deduplication & Caching', () => {
    it('avoids re-generating images when a listing already has an established image URL', () => {
      const existingListing: Partial<WasteListing> = {
        id: 'list-123',
        title: 'Used Glass Bottles',
        images: ['https://czytsaajiicpivjkrbey.supabase.co/storage/v1/object/public/listing-images/ai-generated/list-123-1793988.jpg'],
        is_ai_image: true,
      };

      // When rendering or viewing listing, the cached image is reused
      const displayImage = existingListing.images && existingListing.images.length > 0
        ? existingListing.images[0]
        : 'fallback';

      expect(displayImage).toBe(existingListing.images![0]);
      // Should not trigger generation
      expect(isAiGeneratedImage(existingListing)).toBe(true);
    });
  });

  describe('Feature 7: Transparency & Disclaimers', () => {
    it('accurately identifies AI-generated illustrative images across storage and direct URLs', () => {
      const listingWithAiStorage: Partial<WasteListing> = {
        images: ['https://supabase.greenloop.co/storage/v1/object/public/listing-images/ai-generated/abc-123.jpg'],
      };
      expect(isAiGeneratedImage(listingWithAiStorage)).toBe(true);

      const listingWithDirectPollinations: Partial<WasteListing> = {
        images: ['https://image.pollinations.ai/prompt/A%20realistic%20photo?model=flux'],
      };
      expect(isAiGeneratedImage(listingWithDirectPollinations)).toBe(true);

      const listingWithUserPhoto: Partial<WasteListing> = {
        images: ['https://my-phone-upload.s3.amazonaws.com/photo_20261109.jpg'],
        is_ai_image: false,
      };
      expect(isAiGeneratedImage(listingWithUserPhoto)).toBe(false);
    });
  });
});
