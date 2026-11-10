import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getFixedMarketplaceListings,
  generateDynamicDemoListings,
  isDemoListing,
  FIXED_MARKETPLACE_MATERIALS,
  DEMO_MATERIALS,
  VERIFIED_REAL_LOCALITIES,
} from '../src/lib/demoMarketplace';
import { calculateDistanceKm, KERALA_DISTRICT_COORDS } from '../src/contexts/LocationContext';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';
import { isLocationInDistrict, isLocationInMunicipality } from '../src/services/mapSearchService';
import { WasteListing } from '../src/types';

describe('GreenLoop Four Permanent Fixed-Location Marketplace Listings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Preservation of the Four Existing Materials', () => {
    it('preserves all four existing listing templates with accurate names, quantities, and units', () => {
      expect(FIXED_MARKETPLACE_MATERIALS).toHaveLength(4);

      // Listing 1: Coconut Husk Waste
      const mat1 = FIXED_MARKETPLACE_MATERIALS[0];
      expect(mat1.id).toBe('demo-coconut-husk');
      expect(mat1.title).toBe('Coconut Husk Waste');
      expect(mat1.category_id).toBe('cat-agricultural');
      expect(mat1.quantity).toBe(25);
      expect(mat1.unit).toBe('kg');
      expect(mat1.condition).toBe('Dry');
      expect(mat1.purpose).toContain('Coir production, gardening and composting');

      // Listing 2: Used Cardboard Boxes
      const mat2 = FIXED_MARKETPLACE_MATERIALS[1];
      expect(mat2.id).toBe('demo-cardboard-boxes');
      expect(mat2.title).toBe('Used Cardboard Boxes');
      expect(mat2.category_id).toBe('cat-paper');
      expect(mat2.quantity).toBe(15);
      expect(mat2.unit).toBe('kg');
      expect(mat2.condition).toBe('Clean and dry');
      expect(mat2.purpose).toContain('Recycling and packaging reuse');

      // Listing 3: Used Plastic Bottles
      const mat3 = FIXED_MARKETPLACE_MATERIALS[2];
      expect(mat3.id).toBe('demo-plastic-bottles');
      expect(mat3.title).toBe('Used Plastic Bottles');
      expect(mat3.category_id).toBe('cat-plastics');
      expect(mat3.quantity).toBe(8);
      expect(mat3.unit).toBe('kg');
      expect(mat3.condition).toBe('Clean and sorted');
      expect(mat3.purpose).toContain('Plastic recycling');

      // Listing 4: Vegetable and Fruit Waste
      const mat4 = FIXED_MARKETPLACE_MATERIALS[3];
      expect(mat4.id).toBe('demo-vegetable-fruit');
      expect(mat4.title).toBe('Vegetable and Fruit Waste');
      expect(mat4.category_id).toBe('cat-organic');
      expect(mat4.quantity).toBe(10);
      expect(mat4.unit).toBe('kg/day');
      expect(mat4.condition).toBe('Fresh and segregated');
      expect(mat4.purpose).toContain('Composting and agricultural reuse');
    });

    it('ensures each listing provides a valid photograph file path', () => {
      FIXED_MARKETPLACE_MATERIALS.forEach((mat) => {
        expect(mat.image).toMatch(/^\/images\/materials\/.*\.(jpg|jpeg|png|webp)$/i);
      });
    });
  });

  describe('2. Permanent Invariant District and Coordinate Assignments', () => {
    it('assigns Listing 1 permanently to Kasaragod (Kanhangad)', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      const l1 = listings.find((l) => l.id === 'demo-coconut-husk');

      expect(l1).toBeDefined();
      expect(l1!.district).toBe('Kasaragod');
      expect(l1!.locality).toBe('Kanhangad');
      expect(l1!.municipality).toBe('Kanhangad');
      expect(l1!.latitude).toBe(12.3089);
      expect(l1!.longitude).toBe(75.0906);
    });

    it('assigns Listing 2 permanently to Kannur (Thalassery)', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      const l2 = listings.find((l) => l.id === 'demo-cardboard-boxes');

      expect(l2).toBeDefined();
      expect(l2!.district).toBe('Kannur');
      expect(l2!.locality).toBe('Thalassery');
      expect(l2!.municipality).toBe('Thalassery');
      expect(l2!.latitude).toBe(11.7483);
      expect(l2!.longitude).toBe(75.4894);
    });

    it('assigns Listing 3 permanently to Kollam (Karunagappally)', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      const l3 = listings.find((l) => l.id === 'demo-plastic-bottles');

      expect(l3).toBeDefined();
      expect(l3!.district).toBe('Kollam');
      expect(l3!.locality).toBe('Karunagappally');
      expect(l3!.municipality).toBe('Karunagappally');
      expect(l3!.latitude).toBe(9.0556);
      expect(l3!.longitude).toBe(76.5361);
    });

    it('assigns Listing 4 permanently to Thrissur (Irinjalakuda)', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      const l4 = listings.find((l) => l.id === 'demo-vegetable-fruit');

      expect(l4).toBeDefined();
      expect(l4!.district).toBe('Thrissur');
      expect(l4!.locality).toBe('Irinjalakuda');
      expect(l4!.municipality).toBe('Irinjalakuda');
      expect(l4!.latitude).toBe(10.3444);
      expect(l4!.longitude).toBe(76.2089);
    });
  });

  describe('3. Invariance Across Different User Sessions, Logins, and GPS Locations', () => {
    it('produces identical coordinates and districts regardless of caller reference coordinates', () => {
      // User A in Kasaragod
      const listingsUserA = generateDynamicDemoListings(
        { latitude: 12.4996, longitude: 74.9869 },
        'Vidyanagar',
        'Kasaragod',
        'Kasaragod',
        INITIAL_CATEGORIES
      );

      // User B in Kannur
      const listingsUserB = generateDynamicDemoListings(
        { latitude: 11.8745, longitude: 75.3704 },
        'Payyambalam',
        'Kannur',
        'Kannur',
        INITIAL_CATEGORIES
      );

      // User C in Ernakulam
      const listingsUserC = generateDynamicDemoListings(
        { latitude: 9.9816, longitude: 76.2999 },
        'Kochi Central',
        'Ernakulam',
        'Kochi',
        INITIAL_CATEGORIES
      );

      // All 4 listings must match 1:1 across all three user locations
      expect(listingsUserA).toHaveLength(4);
      expect(listingsUserB).toHaveLength(4);
      expect(listingsUserC).toHaveLength(4);

      for (let i = 0; i < 4; i++) {
        expect(listingsUserA[i].district).toBe(listingsUserB[i].district);
        expect(listingsUserA[i].district).toBe(listingsUserC[i].district);

        expect(listingsUserA[i].locality).toBe(listingsUserB[i].locality);
        expect(listingsUserA[i].locality).toBe(listingsUserC[i].locality);

        expect(listingsUserA[i].latitude).toBe(listingsUserB[i].latitude);
        expect(listingsUserA[i].latitude).toBe(listingsUserC[i].latitude);

        expect(listingsUserA[i].longitude).toBe(listingsUserB[i].longitude);
        expect(listingsUserA[i].longitude).toBe(listingsUserC[i].longitude);
      }
    });

    it('ensures stable timestamps so listings do not regenerate or reorder on page refreshes', () => {
      const run1 = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      const run2 = getFixedMarketplaceListings(INITIAL_CATEGORIES);

      expect(run1.map((l) => l.created_at)).toEqual(run2.map((l) => l.created_at));
      expect(run1.map((l) => l.id)).toEqual(run2.map((l) => l.id));
    });
  });

  describe('4. Marketplace and Map District-Wide Filtering Integration', () => {
    const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);

    it('returns only the Kasaragod listing when filtering by Kasaragod', () => {
      const kasaragodListings = listings.filter((l) => isLocationInDistrict(l, 'Kasaragod'));
      expect(kasaragodListings).toHaveLength(1);
      expect(kasaragodListings[0].id).toBe('demo-coconut-husk');
      expect(kasaragodListings[0].title).toBe('Coconut Husk Waste');
    });

    it('returns only the Kannur listing when filtering by Kannur', () => {
      const kannurListings = listings.filter((l) => isLocationInDistrict(l, 'Kannur'));
      expect(kannurListings).toHaveLength(1);
      expect(kannurListings[0].id).toBe('demo-cardboard-boxes');
      expect(kannurListings[0].title).toBe('Used Cardboard Boxes');
    });

    it('returns only the Kollam listing when filtering by Kollam', () => {
      const kollamListings = listings.filter((l) => isLocationInDistrict(l, 'Kollam'));
      expect(kollamListings).toHaveLength(1);
      expect(kollamListings[0].id).toBe('demo-plastic-bottles');
      expect(kollamListings[0].title).toBe('Used Plastic Bottles');
    });

    it('returns only the Thrissur listing when filtering by Thrissur', () => {
      const thrissurListings = listings.filter((l) => isLocationInDistrict(l, 'Thrissur'));
      expect(thrissurListings).toHaveLength(1);
      expect(thrissurListings[0].id).toBe('demo-vegetable-fruit');
      expect(thrissurListings[0].title).toBe('Vegetable and Fruit Waste');
    });

    it('returns all 4 listings when filtering by All Kerala', () => {
      const allKerala = listings.filter((l) => isLocationInDistrict(l, 'All Kerala'));
      expect(allKerala).toHaveLength(4);
    });

    it('returns 0 of the four listings when filtering by Ernakulam or Wayanad', () => {
      const ernakulamListings = listings.filter((l) => isLocationInDistrict(l, 'Ernakulam'));
      expect(ernakulamListings).toHaveLength(0);

      const wayanadListings = listings.filter((l) => isLocationInDistrict(l, 'Wayanad'));
      expect(wayanadListings).toHaveLength(0);
    });

    it('matches specific municipalities cleanly for map zoom and navigation', () => {
      const kanhangadListings = listings.filter((l) => isLocationInMunicipality(l, 'Kanhangad'));
      expect(kanhangadListings).toHaveLength(1);
      expect(kanhangadListings[0].id).toBe('demo-coconut-husk');

      const thalasseryListings = listings.filter((l) => isLocationInMunicipality(l, 'Thalassery'));
      expect(thalasseryListings).toHaveLength(1);
      expect(thalasseryListings[0].id).toBe('demo-cardboard-boxes');
    });
  });

  describe('5. Complete Removal of Demo and Sample Indicators', () => {
    it('sets is_demo to false so listings render visually identical to genuine listings', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      listings.forEach((listing) => {
        expect(listing.is_demo).toBe(false);
      });
    });

    it('does not include "Sample" or "Demo" in titles, user full names, or user bios', () => {
      const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);
      listings.forEach((listing) => {
        expect(listing.title.toLowerCase()).not.toContain('demo');
        expect(listing.title.toLowerCase()).not.toContain('sample');

        if (listing.user) {
          expect(listing.user.full_name.toLowerCase()).not.toContain('sample');
          expect(listing.user.full_name.toLowerCase()).not.toContain('demo');
          expect(listing.user.bio?.toLowerCase()).not.toContain('competition demonstration');
        }
      });
    });
  });
});
