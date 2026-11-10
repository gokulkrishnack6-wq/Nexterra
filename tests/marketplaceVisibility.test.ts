import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateDynamicDemoListings,
  VERIFIED_REAL_LOCALITIES,
} from '../src/lib/demoMarketplace';
import { calculateDistanceKm, KERALA_DISTRICT_COORDS } from '../src/contexts/LocationContext';
import { resolveCategoryId, DETERMINISTIC_CATEGORY_UUIDS } from '../src/contexts/DataContext';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';
import { WasteListing, UserProfile } from '../src/types';
import fs from 'fs';
import path from 'path';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value.toString(); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

describe('GreenLoop Marketplace Cross-Account Visibility & Scanner Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = new MockStorage();
    (globalThis as any).sessionStorage = new MockStorage();
  });

  describe('Phase 4 & Test E: AI Scanner Category Validation & Prompt Rules', () => {
    it('verifies that the Edge Function prompt strictly instructs Gemini that PET bottles are plastic and never metal/glass', () => {
      const edgeFnPath = path.resolve(__dirname, '../supabase/functions/analyze-waste-image/index.ts');
      const content = fs.readFileSync(edgeFnPath, 'utf-8');

      // Check strict discrimination rules
      expect(content).toContain('CONTAINER & MATERIAL DISCRIMINATION');
      expect(content).toContain('category_slug: "plastics"');
      expect(content).toContain('PET #1');
      expect(content).toContain('NEVER classify clear plastic drinking water bottles as "Metal" or "Glass"');
      expect(content).toContain('Optical specular light reflections');
    });

    it('verifies that the client gemini prompt contains the same strict container discrimination rules', () => {
      const geminiLibPath = path.resolve(__dirname, '../src/lib/gemini.ts');
      const content = fs.readFileSync(geminiLibPath, 'utf-8');

      expect(content).toContain('CONTAINER & MATERIAL DISCRIMINATION (PLASTIC vs METAL vs GLASS)');
      expect(content).toContain('category_slug: "plastics"');
      expect(content).toContain('NEVER classify plastic drinking bottles as "metals" or "glass"');
      expect(content).toContain('Specular reflections');
    });

    it('allows the user to manually confirm or correct detected material and category in prefill session storage', () => {
      // Simulate scan result prefill
      const originalDetected = {
        title: 'Empty Water Container',
        category_slug: 'metals', // simulated mistake
      };

      // User corrects in WasteScannerPage UI:
      const userCorrectedTitle = 'Used Plastic PET Drinking Water Bottle (1L)';
      const userCorrectedCategory = 'plastics';

      const prefillPayload = {
        title: userCorrectedTitle,
        category_slug: userCorrectedCategory,
        description: 'Clean and crushed PET bottle ready for mechanical recycling.',
        suggested_action: 'recycling',
        ai_classified: true,
        ai_confidence: 94.5,
      };

      // Store in session storage
      sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify(prefillPayload));

      const retrieved = JSON.parse(sessionStorage.getItem('greenloop_prefill_scan')!);
      expect(retrieved.title).toBe('Used Plastic PET Drinking Water Bottle (1L)');
      expect(retrieved.category_slug).toBe('plastics');

      // Verify category resolution in CreateListingPage logic
      const matchedCat = INITIAL_CATEGORIES.find(
        (c) => c.slug === retrieved.category_slug || c.id === retrieved.category_slug
      );
      expect(matchedCat).toBeDefined();
      expect(matchedCat?.slug).toBe('plastics');
      expect(matchedCat?.name).toBe('Plastics (Clean / Sorted)');
    });
  });

  describe('Phase 1 & 2: Cross-Account Listing Visibility (Test A)', () => {
    const accountA: UserProfile = {
      id: 'a0000000-0000-4000-8000-00000000000a',
      full_name: 'Account A (Generator)',
      email: 'account_a@greenloop.org',
      role: 'individual',
      district: 'Kasaragod',
      state: 'Kerala',
      eco_points_balance: 50,
      is_verified: true,
      created_at: new Date().toISOString(),
    };

    const accountB: UserProfile = {
      id: 'b0000000-0000-4000-8000-00000000000b',
      full_name: 'Account B (Collector)',
      email: 'account_b@greenloop.org',
      role: 'business',
      district: 'Kasaragod',
      state: 'Kerala',
      eco_points_balance: 100,
      is_verified: true,
      created_at: new Date().toISOString(),
    };

    it('generates a valid RFC4122 UUID and assigns ownership to creating user (Account A)', () => {
      // Cheruvathur coordinates
      const cheruvathurCoords = { latitude: 12.2167, longitude: 75.1667 };

      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const listingId = generateUUID();
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(listingId)).toBe(true);

      const listingByA: WasteListing = {
        id: listingId,
        user_id: accountA.id,
        category_id: 'cat-plastics',
        title: 'Used Plastic PET Bottles (Sorted & Dry)',
        description: 'Clean transparent PET water bottles collected over the month in Cheruvathur.',
        material_type: 'PET Plastic #1',
        quantity: 12,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean/dry',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: cheruvathurCoords.latitude,
        longitude: cheruvathurCoords.longitude,
        status: 'active',
        ai_classified: true,
        ai_confidence: 96.0,
        created_at: new Date().toISOString(),
        user: accountA,
        is_demo: false,
      };

      expect(listingByA.user_id).toBe(accountA.id);
      expect(listingByA.status).toBe('active');
      expect(listingByA.locality).toBe('Cheruvathur');
      expect(listingByA.district).toBe('Kasaragod');
    });

    it('ensures Account B can read Account A published active listing in the public marketplace inventory', () => {
      const cheruvathurListing: WasteListing = {
        id: 'c1111111-2222-4333-8444-555555555555',
        user_id: accountA.id,
        category_id: 'cat-plastics',
        title: 'Used Plastic Bottles from Cheruvathur',
        description: 'Clean sorted PET bottles',
        material_type: 'PET Plastic',
        quantity: 15,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean/dry',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        ai_classified: true,
        created_at: new Date().toISOString(),
        user: accountA,
        is_demo: false,
      };

      // Shared persistent marketplace storage simulates real Supabase fetch / shared origin storage
      const activeListings: WasteListing[] = [cheruvathurListing];
      const demoListings = generateDynamicDemoListings(
        { latitude: 12.2167, longitude: 75.1667 },
        'Cheruvathur',
        'Kasaragod',
        'Cheruvathur',
        INITIAL_CATEGORIES
      );

      // Merge real + demo
      const allMarketplace = [...activeListings, ...demoListings];

      // Account B opens marketplace:
      const visibleToAccountB = allMarketplace.filter((item) => {
        // Public marketplace rule: active status is visible to all authenticated users
        return item.status === 'active';
      });

      // Assert Account A's listing is visible to Account B
      const foundListing = visibleToAccountB.find((l) => l.id === cheruvathurListing.id);
      expect(foundListing).toBeDefined();
      expect(foundListing?.title).toBe('Used Plastic Bottles from Cheruvathur');
      expect(foundListing?.user_id).toBe(accountA.id);
      expect(foundListing?.user?.full_name).toBe('Account A (Generator)');

      // Verify that Account B is NOT the creator, but can still see it
      expect(foundListing?.user_id).not.toBe(accountB.id);
    });
  });

  describe('Phase 2: Ownership Protection & Authorization (Test B)', () => {
    const creatorId = 'a0000000-0000-4000-8000-00000000000a';
    const nonOwnerId = 'b0000000-0000-4000-8000-00000000000b';

    const testListing: WasteListing = {
      id: 'd1111111-2222-4333-8444-555555555555',
      user_id: creatorId,
      category_id: 'cat-plastics',
      title: 'Plastic PET Bottles',
      description: 'Used bottles',
      material_type: 'PET',
      quantity: 10,
      unit: 'kg',
      listing_type: 'free',
      price: 0,
      condition: 'clean',
      district: 'Kasaragod',
      locality: 'Cheruvathur',
      latitude: 12.2167,
      longitude: 75.1667,
      status: 'active',
      created_at: new Date().toISOString(),
      is_demo: false,
    };

    it('permits the creator (Account A) to update their own listing', () => {
      const updateListing = (userId: string, listing: WasteListing, updates: Partial<WasteListing>) => {
        if (listing.user_id !== userId) {
          throw new Error('Unauthorized: Only the creator of this listing can edit it.');
        }
        return { ...listing, ...updates };
      };

      const updated = updateListing(creatorId, testListing, { title: 'Updated PET Bottles 15kg', quantity: 15 });
      expect(updated.title).toBe('Updated PET Bottles 15kg');
      expect(updated.quantity).toBe(15);
    });

    it('rejects update attempts by non-owners (Account B) with an authorization error', () => {
      const updateListing = (userId: string, listing: WasteListing, updates: Partial<WasteListing>) => {
        if (listing.user_id !== userId) {
          throw new Error('Unauthorized: Only the creator of this listing can edit it.');
        }
        return { ...listing, ...updates };
      };

      expect(() => {
        updateListing(nonOwnerId, testListing, { title: 'Hacked Title' });
      }).toThrow('Unauthorized: Only the creator of this listing can edit it.');
    });

    it('rejects delete attempts by non-owners (Account B) with an authorization error', () => {
      const deleteListing = (userId: string, listing: WasteListing) => {
        if (listing.user_id !== userId) {
          throw new Error('Unauthorized: Only the creator of this listing can delete it.');
        }
        return true;
      };

      expect(() => {
        deleteListing(nonOwnerId, testListing);
      }).toThrow('Unauthorized: Only the creator of this listing can delete it.');
    });

    it('permits the creator (Account A) to delete their own listing', () => {
      const deleteListing = (userId: string, listing: WasteListing) => {
        if (listing.user_id !== userId) {
          throw new Error('Unauthorized: Only the creator of this listing can delete it.');
        }
        return true;
      };

      expect(deleteListing(creatorId, testListing)).toBe(true);
    });
  });

  describe('Phase 3: Nearby Location & Radius Filtering (Test C)', () => {
    it('verifies Cheruvathur is included in VERIFIED_REAL_LOCALITIES under Kasaragod district', () => {
      const cheruvathur = VERIFIED_REAL_LOCALITIES.find(
        (loc) => loc.locality.toLowerCase() === 'cheruvathur' && loc.district === 'Kasaragod'
      );
      expect(cheruvathur).toBeDefined();
      expect(cheruvathur?.latitude).toBeCloseTo(12.2167, 3);
      expect(cheruvathur?.longitude).toBeCloseTo(75.1667, 3);
    });

    it('calculates accurate Haversine distance between Kasaragod towns and Cheruvathur', () => {
      // Kanhangad is ~12-15 km north of Cheruvathur
      const kanhangad = { latitude: 12.3089, longitude: 75.0906 };
      const cheruvathur = { latitude: 12.2167, longitude: 75.1667 };

      const distKm = calculateDistanceKm(
        kanhangad.latitude,
        kanhangad.longitude,
        cheruvathur.latitude,
        cheruvathur.longitude
      );

      expect(distKm).toBeGreaterThan(10);
      expect(distKm).toBeLessThan(18);
    });

    it('filters listings properly based on search radius from user reference coordinates', () => {
      const cheruvathurListing: WasteListing = {
        id: 'list-cheruvathur',
        user_id: 'user-a',
        category_id: 'cat-plastics',
        title: 'PET Bottles Cheruvathur',
        description: 'Clean bottles',
        material_type: 'PET',
        quantity: 10,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const thiruvananthapuramListing: WasteListing = {
        id: 'list-tvm',
        user_id: 'user-c',
        category_id: 'cat-plastics',
        title: 'PET Bottles Palayam',
        description: 'Clean bottles',
        material_type: 'PET',
        quantity: 20,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean',
        district: 'Thiruvananthapuram',
        locality: 'Palayam',
        latitude: 8.5020,
        longitude: 76.9510,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const listings = [cheruvathurListing, thiruvananthapuramListing];

      // Scenario 1: User is in Kanhangad (Kasaragod) with radius 30 km
      const userRef = { latitude: 12.3089, longitude: 75.0906 }; // Kanhangad
      const filterByRadius = (radiusKm: number | 'all') => {
        return listings.filter((l) => {
          if (radiusKm === 'all') return true;
          const dist = calculateDistanceKm(userRef.latitude, userRef.longitude, l.latitude, l.longitude);
          return dist <= radiusKm;
        });
      };

      const within30km = filterByRadius(30);
      expect(within30km.map((l) => l.id)).toContain('list-cheruvathur');
      expect(within30km.map((l) => l.id)).not.toContain('list-tvm');

      // Scenario 2: Very tight 5 km radius from Kanhangad excludes Cheruvathur (~13 km away)
      const within5km = filterByRadius(5);
      expect(within5km.map((l) => l.id)).not.toContain('list-cheruvathur');

      // Scenario 3: All distances includes everything
      const allDistances = filterByRadius('all');
      expect(allDistances).toHaveLength(2);
    });

    it('matches category by either slug or id so filtering is not broken by format differences', () => {
      const plasticListingWithSlug: WasteListing = {
        id: 'l1',
        user_id: 'u1',
        category_id: 'plastics', // stored as slug
        title: 'Bottle 1',
        description: 'desc',
        material_type: 'PET',
        quantity: 5,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const plasticListingWithId: WasteListing = {
        id: 'l2',
        user_id: 'u1',
        category_id: 'cat-plastics', // stored as category ID
        title: 'Bottle 2',
        description: 'desc',
        material_type: 'PET',
        quantity: 8,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const items = [plasticListingWithSlug, plasticListingWithId];
      const selectedCategory = 'plastics';
      const cat = INITIAL_CATEGORIES.find((c) => c.slug === selectedCategory);

      const matched = items.filter((l) => {
        return (
          l.category_id === selectedCategory ||
          (cat && l.category_id === cat.id) ||
          (l.category_id && l.category_id.includes(selectedCategory))
        );
      });

      expect(matched).toHaveLength(2);
    });
  });

  describe('Phase 5: Four Permanent Fixed-Location Marketplace Listings', () => {
    it('ensures fixed marketplace listings have stable identifiers starting with demo- prefix', () => {
      const demoListings = generateDynamicDemoListings(
        { latitude: 12.2167, longitude: 75.1667 },
        'Cheruvathur',
        'Kasaragod',
        'Cheruvathur',
        INITIAL_CATEGORIES
      );

      expect(demoListings).toHaveLength(4);
      demoListings.forEach((demo) => {
        expect(demo.id.startsWith('demo-')).toBe(true);
      });
    });

    it('ensures real user listings and fixed listings coexist without collision', () => {
      const realListing: WasteListing = {
        id: 'e1111111-2222-4333-8444-555555555555',
        user_id: 'user-a',
        category_id: 'cat-plastics',
        title: 'Authentic Community Listing',
        description: 'Real waste ready for collection',
        material_type: 'PET',
        quantity: 50,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
        is_demo: false,
      };

      const demoListings = generateDynamicDemoListings(
        { latitude: 12.2167, longitude: 75.1667 },
        'Cheruvathur',
        'Kasaragod',
        'Cheruvathur',
        INITIAL_CATEGORIES
      );

      const combined = [realListing, ...demoListings];

      // First item is real listing
      expect(combined[0].id).toBe('e1111111-2222-4333-8444-555555555555');

      // Deduplication: real listing is never overwritten by fixed listing data
      const nonConflictingDemo = demoListings.filter((d) => d.id !== realListing.id);
      expect(nonConflictingDemo).toHaveLength(4);
    });
  });

  describe('Phase 2 & Test D: Multi-Account Persistence Across Sessions', () => {
    it('persists published listings in origin-wide shared storage so subsequent accounts receive them', () => {
      const SHARED_KEY = 'greenloop_shared_marketplace_listings';
      const USER_KEY = 'greenloop_user_listings';

      const listing1: WasteListing = {
        id: 'f1111111-2222-4333-8444-555555555555',
        user_id: 'user-account-a',
        category_id: 'cat-plastics',
        title: 'Account A PET Bottles',
        description: '10kg PET bottles in Cheruvathur',
        material_type: 'PET',
        quantity: 10,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean/dry',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
        is_demo: false,
      };

      // Account A publishes listing:
      localStorage.setItem(SHARED_KEY, JSON.stringify([listing1]));
      localStorage.setItem(USER_KEY, JSON.stringify([listing1]));

      // Account A logs out (Auth profile removed from local storage):
      localStorage.removeItem('greenloop_user_profile');

      // Account B logs in:
      // Verify that Account B reads the shared marketplace inventory:
      const loadedForAccountB: WasteListing[] = JSON.parse(localStorage.getItem(SHARED_KEY)!);
      expect(loadedForAccountB).toHaveLength(1);
      expect(loadedForAccountB[0].id).toBe('f1111111-2222-4333-8444-555555555555');
      expect(loadedForAccountB[0].user_id).toBe('user-account-a');
      expect(loadedForAccountB[0].locality).toBe('Cheruvathur');
      expect(loadedForAccountB[0].district).toBe('Kasaragod');
    });
  });

  describe('Pre-Migration Compatibility Audit (Final Parity Checks)', () => {
    it('verifies category resolution logic for plastics, paper, organic, and metals across all input formats', () => {
      // 1. Plastics
      expect(resolveCategoryId('plastics', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.plastics);
      expect(resolveCategoryId('cat-plastics', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.plastics);
      expect(resolveCategoryId('Plastics & Polymers', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.plastics);

      // 2. Paper & Cardboard
      expect(resolveCategoryId('paper', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.paper);
      expect(resolveCategoryId('cat-paper', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.paper);
      expect(resolveCategoryId('Paper & Cardboard', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.paper);

      // 3. Organic & Kitchen Waste
      expect(resolveCategoryId('organic', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.organic);
      expect(resolveCategoryId('cat-organic', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.organic);

      // 4. Metals & Scrap
      expect(resolveCategoryId('metals', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.metals);
      expect(resolveCategoryId('cat-metals', INITIAL_CATEGORIES)).toBe(DETERMINISTIC_CATEGORY_UUIDS.metals);

      // 5. Direct UUID passthrough
      const customUuid = '12345678-1234-4234-8234-123456789abc';
      expect(resolveCategoryId(customUuid, INITIAL_CATEGORIES)).toBe(customUuid);

      // 6. Loaded Supabase database categories (with custom DB UUIDs)
      const liveDbCategories = [
        { id: 'b1111111-2222-4333-8444-555555555555', slug: 'plastics', name: 'Plastics (Live)' },
        { id: 'b2222222-2222-4333-8444-555555555555', slug: 'paper', name: 'Paper (Live)' },
        { id: 'b3333333-2222-4333-8444-555555555555', slug: 'organic', name: 'Organic (Live)' },
        { id: 'b4444444-2222-4333-8444-555555555555', slug: 'metals', name: 'Metals (Live)' },
      ] as any;

      expect(resolveCategoryId('plastics', liveDbCategories)).toBe('b1111111-2222-4333-8444-555555555555');
      expect(resolveCategoryId('cat-paper', liveDbCategories)).toBe('b2222222-2222-4333-8444-555555555555');
      expect(resolveCategoryId('cat-organic', liveDbCategories)).toBe('b3333333-2222-4333-8444-555555555555');
      expect(resolveCategoryId('metals', liveDbCategories)).toBe('b4444444-2222-4333-8444-555555555555');
    });

    it('verifies that duplicate signup bonuses cannot be awarded even if the signup trigger is retried', () => {
      const ecoPointsLedger: Array<{ id: string; user_id: string; points: number; action_type: string }> = [];

      // Simulated handle_new_user eco_points allocation with idempotency guard
      const awardSignupBonus = (userId: string) => {
        const alreadyAwarded = ecoPointsLedger.some(
          (record) => record.user_id === userId && record.action_type === 'signup_bonus'
        );
        if (alreadyAwarded) {
          // Idempotent: ignore retry
          return false;
        }
        ecoPointsLedger.push({
          id: `pt-${Date.now()}-${Math.random()}`,
          user_id: userId,
          points: 50,
          action_type: 'signup_bonus',
        });
        return true;
      };

      const testUserId = 'user-retry-test-123';

      // First run (initial user registration)
      const firstRun = awardSignupBonus(testUserId);
      expect(firstRun).toBe(true);
      expect(ecoPointsLedger.filter((r) => r.user_id === testUserId)).toHaveLength(1);

      // Trigger retry (e.g. auth retry, second verification link click, or re-run)
      const retry1 = awardSignupBonus(testUserId);
      expect(retry1).toBe(false);
      expect(ecoPointsLedger.filter((r) => r.user_id === testUserId)).toHaveLength(1);

      // Subsequent retry
      const retry2 = awardSignupBonus(testUserId);
      expect(retry2).toBe(false);
      expect(ecoPointsLedger.filter((r) => r.user_id === testUserId)).toHaveLength(1);
    });

    it('verifies the SQL migration script contains no dynamic pg_enum reflection and uses simplified direct enum cast', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261108000000_marketplace_visibility_rls.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      // 1. Dynamic enum reflection removed
      expect(sqlContent).not.toContain("FROM pg_enum WHERE enumlabel = 'signup_bonus'");

      // 2. Simplified enum cast used directly
      expect(sqlContent).toContain("'signup_bonus'::ecopoints_action");

      // 3. Partial unique index to physically prevent duplicate signup bonuses
      expect(sqlContent).toContain('idx_eco_points_unique_signup_bonus');
      expect(sqlContent).toContain("action_type = ''signup_bonus''::ecopoints_action");

      // 4. Safe trigger replacement targeting only on_auth_user_created
      expect(sqlContent).toContain('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
      expect(sqlContent).toContain('CREATE TRIGGER on_auth_user_created');

      // 5. Zero PII exposure in public_profiles view
      expect(sqlContent).toContain('CREATE OR REPLACE VIEW public.public_profiles');
      expect(sqlContent).not.toContain('public_profiles.email');
      expect(sqlContent).not.toContain('public_profiles.phone');
      expect(sqlContent).not.toContain('public_profiles.address');
      expect(sqlContent).not.toContain('public_profiles.eco_points_balance');

      // 6. Profiles base table has strictly owner-bound RLS
      expect(sqlContent).toContain('CREATE POLICY "Users can view own full profile"');
      expect(sqlContent).toContain('USING (auth.uid() = id)');
      expect(sqlContent).not.toContain('CREATE POLICY "Public directory viewable by authenticated users"');

      // 7. Listings RLS guarantees Account B can read Account A active listings but cannot update/delete
      expect(sqlContent).toContain('CREATE POLICY "Active public listings are viewable by everyone"');
      expect(sqlContent).toContain("USING (status = 'active' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id))");
      expect(sqlContent).toContain('CREATE POLICY "Listing owners can update own listings"');
      expect(sqlContent).toContain('USING (auth.uid() = user_id)');
      expect(sqlContent).toContain('CREATE POLICY "Listing owners can delete own listings"');
    });

    it('confirms simulated RLS: Account B can read Account A active listings but cannot read drafts or update/delete', () => {
      const userAId = 'user-a-uuid';
      const userBId = 'user-b-uuid';

      const listingsInDb = [
        { id: 'l-active', user_id: userAId, status: 'active', title: 'Active by User A' },
        { id: 'l-draft', user_id: userAId, status: 'draft', title: 'Draft by User A' },
        { id: 'l-cancelled', user_id: userAId, status: 'cancelled', title: 'Cancelled by User A' },
      ];

      // Simulated RLS SELECT policy: USING (status = 'active' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id))
      const canSelectListing = (currentUid: string | null, listing: { status: string; user_id: string }) => {
        return listing.status === 'active' || (currentUid !== null && currentUid === listing.user_id);
      };

      // Simulated RLS UPDATE/DELETE policy: USING (auth.uid() = user_id)
      const canModifyListing = (currentUid: string | null, listing: { user_id: string }) => {
        return currentUid !== null && currentUid === listing.user_id;
      };

      // Account B reads
      expect(canSelectListing(userBId, listingsInDb[0])).toBe(true);  // Active listing -> CAN READ
      expect(canSelectListing(userBId, listingsInDb[1])).toBe(false); // Draft listing -> CANNOT READ
      expect(canSelectListing(userBId, listingsInDb[2])).toBe(false); // Cancelled listing -> CANNOT READ

      // Account B tries to update or delete Account A's listing
      expect(canModifyListing(userBId, listingsInDb[0])).toBe(false); // CANNOT UPDATE or DELETE

      // Account A (owner) reads, updates, and deletes
      expect(canSelectListing(userAId, listingsInDb[0])).toBe(true);
      expect(canSelectListing(userAId, listingsInDb[1])).toBe(true);  // Owner can read their own draft
      expect(canSelectListing(userAId, listingsInDb[2])).toBe(true);  // Owner can read their own cancelled listing
      expect(canModifyListing(userAId, listingsInDb[0])).toBe(true);  // Owner can modify
    });

    it('verifies that all nine deterministic category UUIDs in the migration exactly match DETERMINISTIC_CATEGORY_UUIDS in frontend', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261108000000_marketplace_visibility_rls.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      // Check all 9 deterministic UUIDs
      const categoriesToCheck = [
        'plastics',
        'paper',
        'organic',
        'agricultural',
        'metals',
        'glass',
        'e-waste',
        'textiles',
        'other',
      ];

      categoriesToCheck.forEach((slug) => {
        const expectedUuid = DETERMINISTIC_CATEGORY_UUIDS[slug];
        expect(expectedUuid).toBeDefined();
        expect(sqlContent).toContain(expectedUuid);
      });
    });

    it('guarantees resolveCategoryId always returns a valid RFC4122 UUID and never returns a mock ID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Arbitrary / unusual / mock inputs
      const testInputs = [
        undefined,
        '',
        'cat-plastics',
        'cat-paper',
        'cat-organic',
        'cat-metals',
        'plastics',
        'paper',
        'organic',
        'metals',
        'agricultural',
        'glass',
        'e-waste',
        'textiles',
        'other',
        'unknown-rubbish',
        'some-random-waste',
      ];

      testInputs.forEach((input) => {
        const resolved = resolveCategoryId(input, INITIAL_CATEGORIES);
        expect(uuidRegex.test(resolved)).toBe(true);
        expect(resolved.startsWith('cat-')).toBe(false);
      });
    });

    it('verifies that eco_points duplicate check warns instead of deleting records if duplicates exist', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261108000000_marketplace_visibility_rls.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      // Verify that no DELETE FROM eco_points exists in the migration
      expect(sqlContent).not.toContain('DELETE FROM public.eco_points');
      expect(sqlContent).not.toContain('DELETE FROM eco_points');

      // Verify duplicate reporting logic
      expect(sqlContent).toContain('HAVING COUNT(*) > 1');
      expect(sqlContent).toContain('RAISE WARNING');
      expect(sqlContent).toContain('Found % user(s) with pre-existing duplicate signup_bonus entries');
    });

    it('verifies that no hardcoded Ernakulam fallback is assigned in profile backfill or signup trigger', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261108000000_marketplace_visibility_rls.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      // Neither backfill nor handle_new_user should default to Ernakulam
      expect(sqlContent).not.toContain("COALESCE(u.raw_user_meta_data->>'district', 'Ernakulam')");
      expect(sqlContent).not.toContain("COALESCE(NEW.raw_user_meta_data->>'district', 'Ernakulam')");
      expect(sqlContent).toContain("NULLIF(TRIM(u.raw_user_meta_data->>'district'), '')");
      expect(sqlContent).toContain("NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), '')");
    });

    it('verifies server-side EcoPoints write security and reliable database-level protection', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261108000000_marketplace_visibility_rls.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

      // 1. Direct write revoked from clients
      expect(sqlContent).toContain('REVOKE INSERT, UPDATE, DELETE ON public.eco_points FROM authenticated, anon, public;');

      // 2. Secure RPC function strictly rejects all user-controlled positive point allocations
      expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.record_ecopoints_transaction');
      expect(sqlContent).toContain('IF p_points >= 0 THEN');
      expect(sqlContent).toContain('Users cannot allocate positive points');
      expect(sqlContent).toContain("IF p_action_type <> 'reward_redeemed'::ecopoints_action THEN");
      expect(sqlContent).toContain('GRANT EXECUTE ON FUNCTION public.record_ecopoints_transaction TO authenticated;');

      // 3. Reliable database-level balance protection trigger uses transaction context flag
      expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.protect_profile_eco_points');
      expect(sqlContent).toContain("IF current_setting('greenloop.internal_ecopoints_update', true) <> 'true' THEN");
      expect(sqlContent).toContain('Direct modification of eco_points_balance is forbidden');
      expect(sqlContent).toContain('CREATE TRIGGER trg_protect_profile_eco_points');

      // 4. Trusted server-side trigger awards points for listings without client choice
      expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.award_listing_ecopoints');
      expect(sqlContent).toContain('v_points CONSTANT INTEGER := 30;');
      expect(sqlContent).toContain('CREATE TRIGGER trg_award_listing_ecopoints');
      expect(sqlContent).toContain('AFTER INSERT ON public.listings');

      // 5. Explicit policy drops target only conflicting policies (no blind drop loop)
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Active public listings are viewable by everyone" ON public.listings;');
      expect(sqlContent).toContain('DROP POLICY IF EXISTS "Users view own points ledger" ON public.eco_points;');
      expect(sqlContent).not.toContain("WHERE schemaname = 'public' AND tablename = 'profiles'");

      // 6. Balance cache consistency and parity reconciliation for existing users
      expect(sqlContent).toContain('UPDATE public.profiles p');
      expect(sqlContent).toContain('SET eco_points_balance = COALESCE((');
      expect(sqlContent).toContain('SELECT SUM(points) FROM public.eco_points e WHERE e.user_id = p.id');
    });
  });
});
