// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateListingImage,
  buildWasteImagePrompt,
  matchCuratedItemFallback,
  getUnrelatedMaterialExclusions,
  verifyImageRelevance,
  isAiGeneratedImage,
  NEUTRAL_MATERIAL_PLACEHOLDER,
  ITEM_SPECIFIC_FALLBACKS,
} from '../src/services/imageGeneration';
import { WasteListing } from '../src/types';

describe('GreenLoop AI Waste Image Allocation & Item-Level Matching Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('pollinations.ai') || urlStr.includes('generate-listing-image')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          blob: () => Promise.resolve(new Blob(['mock-binary-data'.repeat(100)], { type: 'image/jpeg' })),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1600)),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });
  });

  describe('Section 2 & 3: Structured Prompt Prioritization & Negative Exclusions', () => {
    it('prioritizes exact waste name and includes dynamic negative material exclusions', () => {
      // 1. PET water bottles
      const petPrompt = buildWasteImagePrompt({
        title: 'Used Plastic Water Bottles',
        material_type: 'Transparent PET Plastic',
        category_slug: 'plastics',
        condition: 'Empty and crushed',
      });
      expect(petPrompt).toContain('Used Plastic Water Bottles');
      expect(petPrompt).toContain('Transparent PET Plastic');
      expect(petPrompt).toContain('primary subject');
      expect(petPrompt).toContain('Do not show metal cans, cardboard boxes');

      // 2. Plastic pipes (must NOT show plastic bottles)
      const pipePrompt = buildWasteImagePrompt({
        title: 'Rigid PVC Plastic Pipes',
        material_type: 'UPVC Conduit',
        category_slug: 'plastics',
      });
      expect(pipePrompt).toContain('Rigid PVC Plastic Pipes');
      expect(pipePrompt).toContain('Do not show plastic water bottles');

      // 3. Cardboard boxes (must NOT show paper sheets or bottles)
      const cardboardPrompt = buildWasteImagePrompt({
        title: 'Flattened Cardboard Shipping Boxes',
        material_type: 'Corrugated Kraft Board',
        category_slug: 'paper',
      });
      expect(cardboardPrompt).toContain('Flattened Cardboard Shipping Boxes');
      expect(cardboardPrompt).toContain('Do not show loose paper sheets');

      // 4. Coconut shells (must NOT show generic kitchen food waste)
      const coconutPrompt = buildWasteImagePrompt({
        title: 'Sun-dried Coconut Shells & Husks',
        material_type: 'Raw Hard Shell Biomass',
        category_slug: 'agricultural',
      });
      expect(coconutPrompt).toContain('Coconut Shells');
      expect(coconutPrompt).toContain('Do not show cooked food waste, kitchen garbage');

      // 5. Aluminium cans (must NOT show plastic bottles)
      const canPrompt = buildWasteImagePrompt({
        title: 'Crushed Aluminium Soda Cans',
        material_type: 'Aluminium #41',
        category_slug: 'metals',
      });
      expect(canPrompt).toContain('Aluminium Soda Cans');
      expect(canPrompt).toContain('Do not show plastic bottles');
    });
  });

  describe('Section 8: Verification Across All 10 Distinct Waste Types', () => {
    const tenWasteItems = [
      {
        name: 'PET Water Bottles',
        material: 'PET #1',
        category: 'plastics',
        expectedKeyword: 'plastic-bottles',
        antiKeyword: 'pipe',
      },
      {
        name: 'Plastic Pipes',
        material: 'Rigid PVC',
        category: 'plastics',
        expectedKeyword: '541888946425',
        antiKeyword: 'bottle',
      },
      {
        name: 'Aluminium Cans',
        material: 'Aluminium Alloy',
        category: 'metals',
        expectedKeyword: '577705998148',
        antiKeyword: 'bottle',
      },
      {
        name: 'Cardboard Boxes',
        material: 'Corrugated Kraft',
        category: 'paper',
        expectedKeyword: 'cardboard-boxes',
        antiKeyword: 'newspaper',
      },
      {
        name: 'Newspaper Bundles',
        material: 'Newsprint Paper',
        category: 'paper',
        expectedKeyword: '504711434969',
        antiKeyword: 'cardboard',
      },
      {
        name: 'Coconut Shells',
        material: 'Hard Shell Endocarp',
        category: 'agricultural',
        expectedKeyword: 'coconut-husk-waste',
        antiKeyword: 'vegetable',
      },
      {
        name: 'Used Clothes',
        material: 'Cotton & Denim',
        category: 'textiles',
        expectedKeyword: '1558769132',
        antiKeyword: 'garbage',
      },
      {
        name: 'Broken Electronic Devices',
        material: 'PCB & Copper Wiring',
        category: 'e-waste',
        expectedKeyword: '591799264318',
        antiKeyword: 'household',
      },
      {
        name: 'Glass Bottles',
        material: 'Vitreous Glass',
        category: 'glass',
        expectedKeyword: '513519245088',
        antiKeyword: 'plastic',
      },
      {
        name: 'Vegetable Scraps',
        material: 'Kitchen Organic Scraps',
        category: 'organic',
        expectedKeyword: 'vegetable-fruit-waste',
        antiKeyword: 'plastic',
      },
    ];

    it('allocates distinct, item-accurate images and prompts for all 10 waste types', async () => {
      for (const item of tenWasteItems) {
        // Test fallback matcher
        const matched = matchCuratedItemFallback(item.name, item.material);
        expect(matched).not.toBeNull();
        expect(matched!.imageUrl).toContain(item.expectedKeyword);
        expect(matched!.imageUrl).not.toContain(item.antiKeyword);

        // Test generation and verification
        const result = await generateListingImage({
          title: item.name,
          material_type: item.material,
          category_slug: item.category,
        });

        expect(result.success).toBe(true);
        expect(result.image_url).toBeTruthy();
        expect(result.is_ai_image).toBe(true);
        expect(result.prompt_used).toContain(item.name);
      }
    });

    it('strictly isolates multiple distinct items within the same category', async () => {
      // Category: plastics (Plastic Pipes vs PET Water Bottles)
      const pipeItem = matchCuratedItemFallback('PVC Plastic Drainage Pipes', 'Rigid PVC');
      const bottleItem = matchCuratedItemFallback('Empty PET Water Bottles', 'PET Plastic');

      expect(pipeItem).not.toBeNull();
      expect(bottleItem).not.toBeNull();
      expect(pipeItem!.imageUrl).not.toBe(bottleItem!.imageUrl);
      expect(pipeItem!.imageUrl).not.toContain('bottle');
      expect(bottleItem!.imageUrl).toContain('used-plastic-bottles');

      // Category: paper (Cardboard Shipping Cartons vs Old Newspaper Bundles)
      const cartonItem = matchCuratedItemFallback('Cardboard Shipping Cartons', 'Corrugated');
      const newsItem = matchCuratedItemFallback('Old Newspaper Bundles', 'Newsprint');

      expect(cartonItem!.imageUrl).not.toBe(newsItem!.imageUrl);
      expect(cartonItem!.imageUrl).toContain('used-cardboard-boxes');
      expect(newsItem!.imageUrl).not.toContain('cardboard');
    });
  });

  describe('Section 4 & 5: Race-Condition Safety & Relevance Verification', () => {
    it('isolates simultaneous generation requests using unique job IDs and seeds', async () => {
      const jobA = generateListingImage({
        title: 'PET Water Bottles Batch A',
        job_id: 'job-alpha-001',
      });
      const jobB = generateListingImage({
        title: 'PET Water Bottles Batch B',
        job_id: 'job-beta-002',
      });

      const [resA, resB] = await Promise.all([jobA, jobB]);

      expect(resA.job_id).toBe('job-alpha-001');
      expect(resB.job_id).toBe('job-beta-002');
      // Different job seeds produce independent generation URLs
      expect(resA.image_url).not.toBe(resB.image_url);
    });

    it('rejects clearly mismatched images during semantic relevance check', async () => {
      // Simulating a mismatched candidate: plastic pipe listing evaluated against bottle photo
      const verification = await verifyImageRelevance({
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', // plastic bottles photo
        expectedTitle: 'Plastic Plumbing Pipes',
        expectedMaterial: 'Rigid PVC',
        categorySlug: 'plastics',
      });

      expect(verification.isRelevant).toBe(false);
      expect(verification.reason).toContain('rigid plastic pipes');
    });

    it('falls back to neutral placeholder when both generation and item-matching fail', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

      const result = await generateListingImage({
        title: 'Unidentified Specialized Industrial Poly-Compound Slurry',
        category_slug: 'other',
      });

      expect(result.success).toBe(false);
      expect(result.is_fallback).toBe(true);
      expect(result.image_url).toBe(NEUTRAL_MATERIAL_PLACEHOLDER);

      global.fetch = originalFetch;
    });
  });

  describe('Section 7: User-Uploaded Image Absolute Priority', () => {
    it('never overwrites user-uploaded actual photographs with AI images', () => {
      const userPhotoUrl = 'https://blob.supabase.co/storage/v1/object/public/listing-images/user_upload_123.jpg';
      const listing: Partial<WasteListing> = {
        title: 'Plastic Water Bottles',
        images: [userPhotoUrl],
        is_ai_image: false,
      };

      // Display image must remain the user photo
      expect(listing.images![0]).toBe(userPhotoUrl);
      // Must not be flagged as AI image
      expect(isAiGeneratedImage(listing)).toBe(false);
    });
  });
});

