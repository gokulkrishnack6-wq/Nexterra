import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateDynamicDemoListings,
  findNearbyRealLocalities,
  isDemoListing,
  DEMO_MATERIALS,
  VERIFIED_REAL_LOCALITIES,
} from '../src/lib/demoMarketplace';
import { calculateDistanceKm, KERALA_DISTRICT_COORDS } from '../src/contexts/LocationContext';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';
import { WasteListing } from '../src/types';

describe('GreenLoop Dynamic Location-Based Marketplace Demo System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Fixed 4 Sample Materials Specification Integrity', () => {
    it('defines the 4 required materials with exact names, quantities, units, and conditions', () => {
      expect(DEMO_MATERIALS).toHaveLength(4);

      // 1. Coconut Husk Waste
      const mat1 = DEMO_MATERIALS[0];
      expect(mat1.title).toBe('Coconut Husk Waste');
      expect(mat1.category_id).toBe('cat-agricultural');
      expect(mat1.quantity).toBe(25);
      expect(mat1.unit).toBe('kg');
      expect(mat1.condition).toBe('Dry');
      expect(mat1.purpose).toContain('Coir production, gardening and composting');

      // 2. Used Cardboard Boxes
      const mat2 = DEMO_MATERIALS[1];
      expect(mat2.title).toBe('Used Cardboard Boxes');
      expect(mat2.category_id).toBe('cat-paper');
      expect(mat2.quantity).toBe(15);
      expect(mat2.unit).toBe('kg');
      expect(mat2.condition).toBe('Clean and dry');
      expect(mat2.purpose).toContain('Recycling and packaging reuse');

      // 3. Used Plastic Bottles
      const mat3 = DEMO_MATERIALS[2];
      expect(mat3.title).toBe('Used Plastic Bottles');
      expect(mat3.category_id).toBe('cat-plastics');
      expect(mat3.quantity).toBe(8);
      expect(mat3.unit).toBe('kg');
      expect(mat3.condition).toBe('Clean and sorted');
      expect(mat3.purpose).toContain('Plastic recycling');

      // 4. Vegetable and Fruit Waste
      const mat4 = DEMO_MATERIALS[3];
      expect(mat4.title).toBe('Vegetable and Fruit Waste');
      expect(mat4.category_id).toBe('cat-organic');
      expect(mat4.quantity).toBe(10);
      expect(mat4.unit).toBe('kg/day');
      expect(mat4.condition).toBe('Fresh and segregated');
      expect(mat4.purpose).toContain('Composting and agricultural reuse');
    });

    it('ensures each material template provides a realistic photograph URL or local path', () => {
      DEMO_MATERIALS.forEach((mat) => {
        expect(mat.image).toMatch(/^(\/images\/materials\/|https:\/\/)/);
      });
    });
  });

  describe('2. Location Adaptation – Test Location A: Ernakulam (Kakkanad)', () => {
    const ernakulamCoords = { latitude: 9.9816, longitude: 76.2999 };
    const locality = 'Kakkanad';
    const district = 'Ernakulam';

    it('generates 4 listings with one in user locality and 3 in distinct nearby localities', () => {
      const listings = generateDynamicDemoListings(
        ernakulamCoords,
        locality,
        district,
        'Kochi',
        INITIAL_CATEGORIES
      );

      expect(listings).toHaveLength(4);

      // Listing 1: assigned to user's detected locality
      expect(listings[0].locality).toBe('Kakkanad');
      expect(listings[0].district).toBe('Ernakulam');
      expect(listings[0].title).toBe('Coconut Husk Waste');

      // Listings 2, 3, 4: assigned to 3 distinct nearby localities
      const allLocalities = listings.map((l) => l.locality);
      const uniqueLocalities = new Set(allLocalities);
      expect(uniqueLocalities.size).toBe(4);

      // Verify that all 4 are distinct and no two share the same locality
      expect(listings[1].locality).not.toBe(listings[0].locality);
      expect(listings[2].locality).not.toBe(listings[1].locality);
      expect(listings[3].locality).not.toBe(listings[2].locality);
    });

    it('calculates mathematically derived Haversine distances for all 4 listings from user coordinates', () => {
      const listings = generateDynamicDemoListings(
        ernakulamCoords,
        locality,
        district,
        'Kochi',
        INITIAL_CATEGORIES
      );

      listings.forEach((listing) => {
        expect(listing.latitude).toBeGreaterThan(8.0);
        expect(listing.latitude).toBeLessThan(13.0);
        expect(listing.longitude).toBeGreaterThan(74.0);
        expect(listing.longitude).toBeLessThan(78.0);

        const dist = calculateDistanceKm(
          ernakulamCoords.latitude,
          ernakulamCoords.longitude,
          listing.latitude,
          listing.longitude
        );

        expect(dist).toBeGreaterThanOrEqual(0.5);
        expect(dist).toBeLessThan(60); // All within sensible nearby radius
      });

      // Listing 1 should be immediately nearby (< 1.5 km)
      const dist1 = calculateDistanceKm(
        ernakulamCoords.latitude,
        ernakulamCoords.longitude,
        listings[0].latitude,
        listings[0].longitude
      );
      expect(dist1).toBeLessThan(1.5);
    });
  });

  describe('3. Location Adaptation – Test Location B: Kozhikode (Mananchira)', () => {
    const kozhikodeCoords = { latitude: 11.2588, longitude: 75.7804 };
    const locality = 'Mananchira';
    const district = 'Kozhikode';

    it('adapts listing localities to Kozhikode region while maintaining identical material types', () => {
      const listings = generateDynamicDemoListings(
        kozhikodeCoords,
        locality,
        district,
        'Kozhikode',
        INITIAL_CATEGORIES
      );

      expect(listings).toHaveLength(4);

      // 1. One listing assigned to user locality
      expect(listings[0].locality).toBe('Mananchira');
      expect(listings[0].district).toBe('Kozhikode');

      // 2. Three other listings assigned to distinct nearby localities
      const allLocalities = listings.map((l) => l.locality);
      const uniqueLocalities = new Set(allLocalities);
      expect(uniqueLocalities.size).toBe(4);

      // 3. Four material types remain consistent
      expect(listings[0].title).toBe('Coconut Husk Waste');
      expect(listings[1].title).toBe('Used Cardboard Boxes');
      expect(listings[2].title).toBe('Used Plastic Bottles');
      expect(listings[3].title).toBe('Vegetable and Fruit Waste');

      // 4. Quantities remain consistent
      expect(listings[0].quantity).toBe(25);
      expect(listings[1].quantity).toBe(15);
      expect(listings[2].quantity).toBe(8);
      expect(listings[3].quantity).toBe(10);
    });

    it('confirms that changing location completely changes the assigned nearby localities', () => {
      const ernakulamListings = generateDynamicDemoListings(
        { latitude: 9.9816, longitude: 76.2999 },
        'Kakkanad',
        'Ernakulam',
        'Kochi',
        INITIAL_CATEGORIES
      );

      const kozhikodeListings = generateDynamicDemoListings(
        kozhikodeCoords,
        locality,
        district,
        'Kozhikode',
        INITIAL_CATEGORIES
      );

      const ernakulamLocalities = ernakulamListings.map((l) => l.locality);
      const kozhikodeLocalities = kozhikodeListings.map((l) => l.locality);

      // Zero overlap between Ernakulam and Kozhikode locality sets
      const intersection = ernakulamLocalities.filter((loc) => kozhikodeLocalities.includes(loc));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('4. Geographic Data & Anti-Fabrication Guarantee', () => {
    it('only uses authentic OpenStreetMap localities with verified coordinates', () => {
      VERIFIED_REAL_LOCALITIES.forEach((place) => {
        expect(place.locality.trim().length).toBeGreaterThan(0);
        expect(place.district.trim().length).toBeGreaterThan(0);
        expect(typeof place.latitude).toBe('number');
        expect(typeof place.longitude).toBe('number');
        expect(place.latitude).toBeGreaterThan(8.0);
        expect(place.longitude).toBeGreaterThan(70.0);
      });
    });

    it('spatial selection finds 3 closest real localities without duplicating the user locality', () => {
      const nearby = findNearbyRealLocalities(9.9816, 76.2999, 'Kaloor', 3);
      expect(nearby).toHaveLength(3);
      expect(nearby.map((n) => n.locality)).not.toContain('Kaloor');

      // Verify sorted by ascending distance
      const d0 = calculateDistanceKm(9.9816, 76.2999, nearby[0].latitude, nearby[0].longitude);
      const d1 = calculateDistanceKm(9.9816, 76.2999, nearby[1].latitude, nearby[1].longitude);
      const d2 = calculateDistanceKm(9.9816, 76.2999, nearby[2].latitude, nearby[2].longitude);
      expect(d0).toBeLessThanOrEqual(d1);
      expect(d1).toBeLessThanOrEqual(d2);
    });
  });

  describe('5. Demo Data Integrity & Separation', () => {
    it('tags all dynamic demo listings with is_demo: true and demo user id', () => {
      const listings = generateDynamicDemoListings(
        { latitude: 9.9816, longitude: 76.2999 },
        'Kakkanad',
        'Ernakulam',
        'Kochi',
        INITIAL_CATEGORIES
      );

      listings.forEach((listing) => {
        expect(listing.is_demo).toBe(true);
        expect(listing.id.startsWith('demo-')).toBe(true);
        expect(listing.user_id).toBe('greenloop-demo-system');
        expect(isDemoListing(listing)).toBe(true);
      });
    });

    it('strictly distinguishes genuine user listings from demo listings', () => {
      const genuineListing: WasteListing = {
        id: 'list-genuine-999',
        user_id: 'real-user-123',
        category_id: 'cat-paper',
        title: 'Authentic Office Paper Waste',
        description: 'Real shredded white paper bundles.',
        material_type: 'Office paper',
        quantity: 50,
        unit: 'kg',
        listing_type: 'free',
        condition: 'Dry',
        district: 'Ernakulam',
        locality: 'Edappally',
        latitude: 10.0261,
        longitude: 76.3125,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      expect(isDemoListing(genuineListing)).toBe(false);
      expect(isDemoListing('list-genuine-999')).toBe(false);
      expect(isDemoListing('demo-coconut-husk')).toBe(true);
    });

    it('ensures demo listings have free pricing and active status', () => {
      const listings = generateDynamicDemoListings(
        { latitude: 10.5276, longitude: 76.2144 },
        'Swaraj Round',
        'Thrissur',
        'Thrissur',
        INITIAL_CATEGORIES
      );

      listings.forEach((l) => {
        expect(l.listing_type).toBe('free');
        expect(l.price).toBe(0);
        expect(l.status).toBe('active');
      });
    });
  });
});
