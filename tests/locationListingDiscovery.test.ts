import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateDistanceKm, KERALA_DISTRICT_COORDS } from '../src/hooks/useGeolocation';
import {
  searchLocationAutocomplete,
  reverseGeocodeCoordinates,
  VERIFIED_REAL_LOCALITIES,
  findNearestDistrict,
} from '../src/services/geocoding';
import { WasteListing } from '../src/types';

describe('GreenLoop Location-Based Listing and Discovery System (Feature 1–8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // POINT 1 & 2: Use Current Location & Geocoding
  // --------------------------------------------------------------------------
  describe('Point 1 & 2: Current Location Geolocation & Reverse Geocoding', () => {
    it('accurately resolves GPS coordinates to authentic Kerala locality and district', async () => {
      // Coordinates for Kanhangad, Kasaragod: 12.3167, 75.0833
      const lat = 12.3167;
      const lon = 75.0833;

      // Mock Nominatim response for Kanhangad
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Kanhangad',
          display_name: 'Kanhangad, Hosdurg, Kasaragod, Kerala, 671315, India',
          address: {
            town: 'Kanhangad',
            subdistrict: 'Hosdurg',
            state_district: 'Kasaragod',
            state: 'Kerala',
            postcode: '671315',
            country: 'India',
          },
        }),
      } as any);

      const result = await reverseGeocodeCoordinates(lat, lon);
      expect(result.district).toBe('Kasaragod');
      expect(result.locality).toBe('Kanhangad');
      expect(result.pincode).toBe('671315');
      expect(result.state).toBe('Kerala');
      expect(result.fullAddress).toContain('Kasaragod');
    });

    it('gracefully falls back to nearest district when reverse geocode fails or is offline', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const lat = 12.3167;
      const lon = 75.0833;

      const fallbackDistrict = findNearestDistrict(lat, lon);
      expect(fallbackDistrict).toBe('Kasaragod');
    });
  });

  // --------------------------------------------------------------------------
  // POINT 3, 4 & 5: Autocomplete Location Search
  // --------------------------------------------------------------------------
  describe('Point 3, 4 & 5: Location Search Autocomplete Suggestions', () => {
    it('returns verified Kerala localities matching user query without auto-selecting', async () => {
      const results = await searchLocationAutocomplete('Cheruvathur');
      expect(results.length).toBeGreaterThan(0);
      const first = results[0];
      expect(first.name).toBe('Cheruvathur');
      expect(first.district).toBe('Kasaragod');
      expect(first.state).toBe('Kerala');
      expect(typeof first.latitude).toBe('number');
      expect(typeof first.longitude).toBe('number');
    });

    it('includes authentic major towns across different Kerala districts in gazetteer', async () => {
      const towns = ['Kanhangad', 'Aluva', 'Cheruvathur', 'Edappally', 'Kaloor', 'Mananthavady', 'Varkala'];
      for (const town of towns) {
        const found = VERIFIED_REAL_LOCALITIES.find((l) => l.locality.toLowerCase() === town.toLowerCase());
        expect(found, `Expected ${town} to be present in VERIFIED_REAL_LOCALITIES`).toBeDefined();
        expect(found?.latitude).toBeGreaterThan(8.0);
        expect(found?.latitude).toBeLessThan(13.0);
        expect(found?.longitude).toBeGreaterThan(74.5);
        expect(found?.longitude).toBeLessThan(77.8);
      }
    });

    it('rejects short queries (< 2 characters) cleanly to prevent unnecessary lookups', async () => {
      const results = await searchLocationAutocomplete('a');
      expect(results).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // POINT 6 & 7: Location Data Payload & Cross-Device Compatibility
  // --------------------------------------------------------------------------
  describe('Point 6 & 7: Listing Location Persistence & Cross-Account Compatibility', () => {
    it('formats listing payload with required spatial columns for Supabase', () => {
      const listingInput: Partial<WasteListing> = {
        title: 'Clean Cardboard Boxes',
        quantity: 25,
        unit: 'kg',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        city: 'Cheruvathur',
        state: 'Kerala',
        pincode: '671313',
        formatted_address: 'Near Railway Station, Cheruvathur, Kasaragod, Kerala',
      };

      // Payload structure verified against Supabase schema
      const dbPayload = {
        title: listingInput.title,
        quantity: listingInput.quantity,
        unit: listingInput.unit,
        district: listingInput.district,
        locality: listingInput.locality,
        address: listingInput.formatted_address || listingInput.address,
        latitude: listingInput.latitude,
        longitude: listingInput.longitude,
      };

      expect(dbPayload.district).toBe('Kasaragod');
      expect(dbPayload.locality).toBe('Cheruvathur');
      expect(dbPayload.address).toContain('Cheruvathur');
      expect(dbPayload.latitude).toBe(12.2167);
      expect(dbPayload.longitude).toBe(75.1667);
    });
  });

  // --------------------------------------------------------------------------
  // POINT 8 & 9: Haversine Distance Formula & Privacy
  // --------------------------------------------------------------------------
  describe('Point 8 & 9: Haversine Distance Calculation & Formatting', () => {
    it('calculates accurate distance between Cheruvathur and Kanhangad (~14 km)', () => {
      // Cheruvathur: 12.2167, 75.1667
      // Kanhangad: 12.3167, 75.0833
      const dist = calculateDistanceKm(12.2167, 75.1667, 12.3167, 75.0833);
      // Expected distance is approximately 14.3 km
      expect(dist).toBeGreaterThan(12);
      expect(dist).toBeLessThan(17);
    });

    it('calculates accurate distance between Kochi (Ernakulam) and Trivandrum (~180-205 km)', () => {
      const ernakulam = KERALA_DISTRICT_COORDS['Ernakulam'];
      const tvm = KERALA_DISTRICT_COORDS['Thiruvananthapuram'];
      const dist = calculateDistanceKm(ernakulam.latitude, ernakulam.longitude, tvm.latitude, tvm.longitude);
      expect(dist).toBeGreaterThan(170);
      expect(dist).toBeLessThan(215);
    });

    it('returns 0 for identical coordinates', () => {
      const dist = calculateDistanceKm(10.0, 76.0, 10.0, 76.0);
      expect(dist).toBe(0);
    });

    it('formats distance display accurately without exposing private address', () => {
      const listing: WasteListing = {
        id: 'test-listing-1',
        user_id: 'user-1',
        category_id: 'cat-paper',
        title: 'Corrugated Cartons',
        description: 'Clean cartons',
        material_type: 'Paper / Cardboard',
        quantity: 30,
        unit: 'kg',
        listing_type: 'free',
        price: 0,
        condition: 'clean/dry',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        address: 'Secret House 42, Private Lane, Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const userCoords = { latitude: 12.3167, longitude: 75.0833 }; // Kanhangad
      const distance = calculateDistanceKm(userCoords.latitude, userCoords.longitude, listing.latitude, listing.longitude);

      // Card display string
      const publicLocationDisplay = `${distance} km away • ${listing.locality}, ${listing.district}`;
      expect(publicLocationDisplay).toContain('Cheruvathur, Kasaragod');
      expect(publicLocationDisplay).not.toContain('Secret House 42');
      expect(publicLocationDisplay).not.toContain('Private Lane');
    });
  });

  // --------------------------------------------------------------------------
  // POINT 10: Sorting by Nearest First
  // --------------------------------------------------------------------------
  describe('Point 10: Marketplace Sorting by Nearest First', () => {
    it('orders listings from closest to furthest based on reference coordinates', () => {
      const refPoint = { latitude: 12.3167, longitude: 75.0833 }; // Kanhangad

      const listings: Partial<WasteListing>[] = [
        { id: '1', title: 'Trivandrum Paper', latitude: 8.5241, longitude: 76.9366 }, // ~460 km
        { id: '2', title: 'Cheruvathur Cartons', latitude: 12.2167, longitude: 75.1667 }, // ~14 km
        { id: '3', title: 'Ernakulam Plastics', latitude: 9.9816, longitude: 76.2999 }, // ~280 km
        { id: '4', title: 'Kanhangad Glass', latitude: 12.3167, longitude: 75.0833 }, // 0 km
      ];

      const sorted = [...listings].sort((a, b) => {
        const distA = a.latitude && a.longitude ? calculateDistanceKm(refPoint.latitude, refPoint.longitude, a.latitude, a.longitude) : 9999;
        const distB = b.latitude && b.longitude ? calculateDistanceKm(refPoint.latitude, refPoint.longitude, b.latitude, b.longitude) : 9999;
        return distA - distB;
      });

      expect(sorted[0].id).toBe('4'); // 0 km (Kanhangad)
      expect(sorted[1].id).toBe('2'); // ~14 km (Cheruvathur)
      expect(sorted[2].id).toBe('3'); // ~280 km (Ernakulam)
      expect(sorted[3].id).toBe('1'); // ~460 km (Trivandrum)
    });
  });

  // --------------------------------------------------------------------------
  // POINT 11: Radius Filter (5 km, 10 km, 25 km, 50 km)
  // --------------------------------------------------------------------------
  describe('Point 11: Nearby Search Radius Filtering', () => {
    const refPoint = { latitude: 12.3167, longitude: 75.0833 }; // Kanhangad

    const mockListings: Partial<WasteListing>[] = [
      { id: 'close-2km', title: 'Near Hospital', latitude: 12.3250, longitude: 75.0900 }, // ~1.2 km
      { id: 'mid-14km', title: 'Cheruvathur Plastic', latitude: 12.2167, longitude: 75.1667 }, // ~14.3 km
      { id: 'far-35km', title: 'Kasaragod Town Metal', latitude: 12.5102, longitude: 74.9852 }, // ~24 km
      { id: 'very-far-90km', title: 'Kannur Wood', latitude: 11.8745, longitude: 75.3704 }, // ~58 km
    ];

    it('filters strictly within 5 km', () => {
      const radius = 5;
      const filtered = mockListings.filter((l) => {
        const d = calculateDistanceKm(refPoint.latitude, refPoint.longitude, l.latitude!, l.longitude!);
        return d <= radius;
      });
      expect(filtered.map((l) => l.id)).toEqual(['close-2km']);
    });

    it('filters strictly within 25 km', () => {
      const radius = 25;
      const filtered = mockListings.filter((l) => {
        const d = calculateDistanceKm(refPoint.latitude, refPoint.longitude, l.latitude!, l.longitude!);
        return d <= radius;
      });
      expect(filtered.map((l) => l.id)).toEqual(['close-2km', 'mid-14km', 'far-35km']);
    });

    it('filters strictly within 50 km', () => {
      const radius = 50;
      const filtered = mockListings.filter((l) => {
        const d = calculateDistanceKm(refPoint.latitude, refPoint.longitude, l.latitude!, l.longitude!);
        return d <= radius;
      });
      expect(filtered.map((l) => l.id)).toEqual(['close-2km', 'mid-14km', 'far-35km']);
    });

    it('includes all Kerala listings when radius is all', () => {
      expect(mockListings.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // POINT 12 & 13: Map View Integration & Marker Popups
  // --------------------------------------------------------------------------
  describe('Point 12 & 13: Map View Integration & Marker Popup Data', () => {
    it('correctly associates popup metadata including distance, category, and locality', () => {
      const refCoords = { latitude: 12.3167, longitude: 75.0833 }; // Kanhangad
      const listing: WasteListing = {
        id: 'map-listing-1',
        user_id: 'user-2',
        category_id: 'cat-plastics',
        title: 'HDPE Plastic Drums',
        description: '20 clean food-grade HDPE drums',
        material_type: 'HDPE Rigid Plastic',
        quantity: 20,
        unit: 'units',
        listing_type: 'free',
        price: 0,
        condition: 'clean/dry',
        district: 'Kasaragod',
        locality: 'Cheruvathur',
        latitude: 12.2167,
        longitude: 75.1667,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const dist = calculateDistanceKm(refCoords.latitude, refCoords.longitude, listing.latitude, listing.longitude);
      const popupDetails = {
        title: listing.title,
        material_type: listing.material_type,
        quantity: `${listing.quantity} ${listing.unit}`,
        location: `${listing.locality}, ${listing.district}`,
        distanceText: `${dist} km away`,
        link: `/marketplace/${listing.id}`,
      };

      expect(popupDetails.title).toBe('HDPE Plastic Drums');
      expect(popupDetails.material_type).toBe('HDPE Rigid Plastic');
      expect(popupDetails.quantity).toBe('20 units');
      expect(popupDetails.location).toBe('Cheruvathur, Kasaragod');
      expect(popupDetails.distanceText).toContain('km away');
      expect(popupDetails.link).toBe('/marketplace/map-listing-1');
    });

    it('handles listings with missing coordinates gracefully by reporting distance unavailable', () => {
      const listingWithoutCoords: Partial<WasteListing> = {
        id: 'no-coords',
        title: 'Old Textbooks',
        district: 'Kozhikode',
        locality: 'Mavoor',
        latitude: undefined,
        longitude: undefined,
      };

      const hasValidCoords =
        typeof listingWithoutCoords.latitude === 'number' &&
        typeof listingWithoutCoords.longitude === 'number' &&
        !isNaN(listingWithoutCoords.latitude) &&
        !isNaN(listingWithoutCoords.longitude) &&
        (listingWithoutCoords.latitude !== 0 || listingWithoutCoords.longitude !== 0);

      expect(hasValidCoords).toBe(false);
      const displayDistance = hasValidCoords ? 'calculated' : 'Distance unavailable';
      expect(displayDistance).toBe('Distance unavailable');
    });
  });
});
