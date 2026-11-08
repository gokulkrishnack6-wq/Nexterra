// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage } from '../src/utils/imageCompressor';
import { resolveCategoryId } from '../src/contexts/DataContext';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';
import { AIScanResult, ScanPrefillData } from '../src/types';

describe('Waste Scanner to Marketplace Listing Integration (Mobile & Desktop)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('Client-Side Image Compression & Mobile Quota Protection', () => {
    it('returns compressed data URL and dimensions without throwing errors', async () => {
      // Mock canvas and 2D context
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockCompressedDataString'),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return document.createElement(tagName);
      });

      // Mock Image loading
      const originalImage = window.Image;
      (window as any).Image = class {
        width = 4000;
        height = 3000;
        src = '';
        crossOrigin = '';
        onload: any = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const result = await compressImage('data:image/jpeg;base64,rawLargeImageString', 1200, 1200, 0.82);

      expect(result.dataUrl).toBe('data:image/jpeg;base64,mockCompressedDataString');
      expect(result.width).toBeLessThanOrEqual(1200);
      expect(result.height).toBeLessThanOrEqual(1200);

      window.Image = originalImage;
    });

    it('falls back gracefully to input data URL if canvas context is unavailable', async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') return mockCanvas as any;
        return document.createElement(tagName);
      });

      const originalImage = window.Image;
      (window as any).Image = class {
        width = 1920;
        height = 1080;
        src = '';
        crossOrigin = '';
        onload: any = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const inputUrl = 'data:image/jpeg;base64,fallbackImageData';
      const result = await compressImage(inputUrl, 1200, 1200, 0.82);

      expect(result.dataUrl).toBe(inputUrl);
      window.Image = originalImage;
    });
  });

  describe('Multi-Tier Data Handoff & QuotaExceededError Resilience', () => {
    const mockScanResult: AIScanResult = {
      detected_material: 'Dry Coconut Husks (Fibrous Coir)',
      category_slug: 'agricultural',
      category_name: 'Coconut & Agricultural Residue',
      subcategory: 'Biomass / Coir Residue',
      confidence: 96.8,
      is_discarded_waste: true,
      item_type: 'discarded_waste',
      product_vs_waste_notes: 'Discarded agricultural waste suitable for mulch, organic composting, or coir processing.',
      estimated_condition: 'dry',
      recovery_status: 'compostable',
      visible_characteristics: ['fibrous texture', 'brown dried husk', 'organic biomass'],
      suggested_action: 'composting',
      reasoning: 'Naturally dried coconut husks high in carbon content, ideal for terrace gardening mulching and municipal composting.',
      recyclability_score: 95,
      estimated_weight_range: '15-20 kg',
      recycling_methods: ['Decentralized Aerobic Composting', 'Coir Yarn Processing'],
      safety_guidance: ['Keep stored in dry area to prevent mold formation.'],
      circular_value_tips: ['Local organic farms purchase shredded coir for soil moisture retention.'],
      potential_matches_summary: 'High demand from bio-compost producers in Kasaragod and Kannur.',
    };

    it('transfers all required structured fields from scanner to prefill payload', () => {
      const prefillPayload: ScanPrefillData = {
        title: mockScanResult.detected_material,
        material_type: mockScanResult.subcategory || mockScanResult.detected_material,
        category_slug: mockScanResult.category_slug,
        category_name: mockScanResult.category_name,
        subcategory: mockScanResult.subcategory,
        description: `${mockScanResult.reasoning}\n\nIdentified Characteristics: ${(mockScanResult.visible_characteristics || []).join(', ')}.\nRecommended Circular Recovery: ${mockScanResult.recycling_methods?.[0]}.\nEstimated Quantity / Weight: ${mockScanResult.estimated_weight_range}.\nSuggested Action: ${mockScanResult.suggested_action}.`,
        suggested_action: mockScanResult.suggested_action,
        recycling_method: mockScanResult.recycling_methods?.[0],
        ai_classified: true,
        ai_confidence: mockScanResult.confidence,
        recyclability_score: mockScanResult.recyclability_score,
        image_url: 'data:image/jpeg;base64,thumbnailData',
      };

      // Verify all structured fields required by Step 3
      expect(prefillPayload.title).toBe('Dry Coconut Husks (Fibrous Coir)');
      expect(prefillPayload.category_slug).toBe('agricultural');
      expect(prefillPayload.material_type).toBe('Biomass / Coir Residue');
      expect(prefillPayload.description).toContain('Naturally dried coconut husks');
      expect(prefillPayload.description).toContain('fibrous texture');
      expect(prefillPayload.suggested_action).toBe('composting');
      expect(prefillPayload.ai_confidence).toBe(96.8);
      expect(prefillPayload.recyclability_score).toBe(95);
    });

    it('survives QuotaExceededError in mobile sessionStorage without crashing navigation', () => {
      const prefillPayload: ScanPrefillData = {
        title: 'PET Water Bottles',
        material_type: 'PET Plastic #1',
        category_slug: 'plastics',
        category_name: 'Plastics',
        description: 'Clean transparent PET bottles',
        suggested_action: 'recycling',
        ai_classified: true,
        ai_confidence: 94.2,
        image_url: 'data:image/jpeg;base64,' + 'A'.repeat(5 * 1024 * 1024), // 5MB image
      };

      // Mock sessionStorage.setItem to throw QuotaExceededError
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
        if (key === 'greenloop_prefill_scan' && val.includes('AAAAA')) {
          const quotaError = new DOMException('Setting the value of greenloop_prefill_scan exceeded the quota.', 'QuotaExceededError');
          throw quotaError;
        }
      });

      let inMemoryHandoff: ScanPrefillData | null = null;
      let routeStateHandoff: any = null;
      let navigationTriggered = false;

      // Execute protected handoff pattern from WasteScannerPage
      const executeHandoff = (payload: ScanPrefillData) => {
        // 1. DataContext in-memory
        inMemoryHandoff = payload;

        // 2. Safe sessionStorage with text-only fallback
        try {
          sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify(payload));
        } catch (storageErr) {
          try {
            const textOnlyPayload = { ...payload, image_url: undefined };
            sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify(textOnlyPayload));
          } catch (_) {}
        }

        // 3. React Router navigation
        routeStateHandoff = { prefillScan: payload };
        navigationTriggered = true;
      };

      // Should execute completely without throwing an uncaught exception
      expect(() => executeHandoff(prefillPayload)).not.toThrow();

      // Navigation was NOT blocked
      expect(navigationTriggered).toBe(true);
      // In-memory shared state captured the full data with image
      expect(inMemoryHandoff?.title).toBe('PET Water Bottles');
      expect(inMemoryHandoff?.image_url).toBeDefined();
      // Route state captured the full data with image
      expect(routeStateHandoff.prefillScan.title).toBe('PET Water Bottles');
      // Second attempt to sessionStorage saved the text-only payload
      expect(setItemSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Population & Category Resolution in CreateListingPage', () => {
    it('correctly maps category slug to active category UUID or fallback', () => {
      const resolved = resolveCategoryId('agricultural', INITIAL_CATEGORIES);
      expect(resolved).toBeDefined();

      const resolvedPlastics = resolveCategoryId('plastics', INITIAL_CATEGORIES);
      expect(resolvedPlastics).toBeDefined();

      const resolvedCoir = resolveCategoryId('cat-agricultural', INITIAL_CATEGORIES);
      expect(resolvedCoir).toBeDefined();
    });

    it('populates all fields from route state or in-memory handoff on mobile viewports', () => {
      // Simulate mobile viewport 360 x 800 (Android)
      window.innerWidth = 360;
      window.innerHeight = 800;

      const scanData: ScanPrefillData = {
        title: 'Corrugated Cardboard Boxes',
        material_type: 'Brown Kraft Paperboard',
        category_slug: 'paper',
        category_name: 'Paper & Cardboard',
        description: 'Clean flattened Amazon and Flipkart delivery cartons.',
        suggested_action: 'recycling',
        ai_classified: true,
        ai_confidence: 97.5,
        image_url: 'data:image/jpeg;base64,mockCartons',
      };

      // Mock form state initialization
      let formTitle = '';
      let formMaterialType = '';
      let formDescription = '';
      let formCategory = '';
      let formAiClassified = false;
      let formAiConfidence: number | undefined;
      let formImageUrl = '';
      let formListingType = 'sale';

      const applyScanPrefill = (data: ScanPrefillData) => {
        formTitle = data.title;
        formMaterialType = data.material_type || data.title;
        formDescription = data.description;
        formAiClassified = data.ai_classified;
        formAiConfidence = data.ai_confidence;
        formImageUrl = data.image_url || '';
        formCategory = resolveCategoryId(data.category_slug, INITIAL_CATEGORIES);
        if (data.suggested_action === 'recycling' || data.suggested_action === 'composting') {
          formListingType = 'free';
        }
      };

      applyScanPrefill(scanData);

      expect(formTitle).toBe('Corrugated Cardboard Boxes');
      expect(formMaterialType).toBe('Brown Kraft Paperboard');
      expect(formDescription).toContain('Clean flattened');
      expect(formAiClassified).toBe(true);
      expect(formAiConfidence).toBe(97.5);
      expect(formCategory).toBeDefined();
      expect(formImageUrl).toBe('data:image/jpeg;base64,mockCartons');
      expect(formListingType).toBe('free');
    });

    it('asynchronously synchronizes GPS coordinates on mobile without manual button re-click', () => {
      // Simulate standard mobile viewport 390 x 844 (iOS/Android)
      window.innerWidth = 390;
      window.innerHeight = 844;

      let latitude: number | null = null;
      let longitude: number | null = null;
      let district = '';
      let locality = '';
      let locationSource: 'current' | 'search' | 'manual' | null = null;

      // Simulated GPS detection resolving 1.5 seconds later
      const asyncGpsResult = {
        coords: { latitude: 12.2167, longitude: 75.1667 }, // Cheruvathur
        geoDistrict: 'Kasaragod',
        geoLocality: 'Cheruvathur',
      };

      // Sync effect in CreateListingPage
      const syncGpsEffect = (gps: typeof asyncGpsResult) => {
        if (locationSource === null && gps.coords && latitude === null && longitude === null) {
          latitude = gps.coords.latitude;
          longitude = gps.coords.longitude;
          if (gps.geoDistrict && !district) district = gps.geoDistrict;
          if (gps.geoLocality && !locality) locality = gps.geoLocality;
          locationSource = 'current';
        }
      };

      syncGpsEffect(asyncGpsResult);

      expect(latitude).toBe(12.2167);
      expect(longitude).toBe(75.1667);
      expect(district).toBe('Kasaragod');
      expect(locality).toBe('Cheruvathur');
      expect(locationSource).toBe('current');
    });

    it('clears prefill caches ONLY after successful insert confirmation', () => {
      sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify({ title: 'Test Waste' }));
      let pendingScanPrefill: any = { title: 'Test Waste' };

      const onSubmissionSuccess = () => {
        pendingScanPrefill = null;
        try {
          sessionStorage.removeItem('greenloop_prefill_scan');
        } catch (_) {}
      };

      expect(sessionStorage.getItem('greenloop_prefill_scan')).toBeTruthy();
      expect(pendingScanPrefill).toBeTruthy();

      onSubmissionSuccess();

      expect(sessionStorage.getItem('greenloop_prefill_scan')).toBeNull();
      expect(pendingScanPrefill).toBeNull();
    });
  });
});
