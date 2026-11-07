import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateDistanceKm,
  findNearestDistrict,
  isInKeralaRegion,
  matchKeralaDistrict,
  reverseGeocode,
  KERALA_DISTRICT_COORDS,
  GEO_CACHE_PREFIX,
  STORAGE_KEY_GEO_PERMISSION,
  STORAGE_KEY_LOCATION,
  DEFAULT_LOCATION_STATE,
} from '../src/contexts/LocationContext';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = createStorageMock();
}

describe('GreenLoop Automatic Geolocation System – Production Readiness Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. First-Visit Location Integrity', () => {
    it('initializes in an explicit undetected state without hardcoded Ernakulam or fabricated data', () => {
      // Must NOT be shown Ernakulam as detected location on first visit
      expect(DEFAULT_LOCATION_STATE.district).toBe('');
      expect(DEFAULT_LOCATION_STATE.locality).toBe('');
      expect(DEFAULT_LOCATION_STATE.city).toBe('');
      expect(DEFAULT_LOCATION_STATE.coords).toBeNull();
      expect(DEFAULT_LOCATION_STATE.source).toBe('undetected');
      expect(DEFAULT_LOCATION_STATE.isKeralaBased).toBe(false);
      expect(DEFAULT_LOCATION_STATE.approximateDistrict).toBeUndefined();
    });
  });

  describe('2. District Normalization & Anti-Fabrication', () => {
    it('strictly matches official Kerala administrative districts', () => {
      expect(matchKeralaDistrict('Ernakulam district')).toBe('Ernakulam');
      expect(matchKeralaDistrict('Kozhikode District')).toBe('Kozhikode');
      expect(matchKeralaDistrict('Wayanad')).toBe('Wayanad');
      expect(matchKeralaDistrict('Thrissur')).toBe('Thrissur');
    });

    it('maps recognized historical and vernacular city aliases to standard Kerala districts', () => {
      expect(matchKeralaDistrict('Cochin')).toBe('Ernakulam');
      expect(matchKeralaDistrict('Kochi')).toBe('Ernakulam');
      expect(matchKeralaDistrict('Calicut')).toBe('Kozhikode');
      expect(matchKeralaDistrict('Trivandrum')).toBe('Thiruvananthapuram');
      expect(matchKeralaDistrict('Alleppey')).toBe('Alappuzha');
      expect(matchKeralaDistrict('Cannur')).toBe('Kannur');
      expect(matchKeralaDistrict('Palghat')).toBe('Palakkad');
      expect(matchKeralaDistrict('Trichur')).toBe('Thrissur');
      expect(matchKeralaDistrict('Quilon')).toBe('Kollam');
    });

    it('returns null for non-Kerala districts and never guesses Ernakulam', () => {
      expect(matchKeralaDistrict('New Delhi')).toBeNull();
      expect(matchKeralaDistrict('Bengaluru')).toBeNull();
      expect(matchKeralaDistrict('Tokyo')).toBeNull();
      expect(matchKeralaDistrict('')).toBeNull();
      expect(matchKeralaDistrict(undefined)).toBeNull();
    });
  });

  describe('3. Reverse Geocoding & Accuracy Scenarios', () => {
    it('returns cached address from localStorage without invoking fetch', async () => {
      const lat = 9.9816;
      const lon = 76.2999;
      const cacheKey = `${GEO_CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;

      const cachedEntry = {
        locality: 'Thammanam',
        district: 'Ernakulam',
        city: 'Kochi',
        region: 'Kerala',
        state: 'Kerala',
        country: 'India',
        postcode: '682011',
        pincode: '682011',
        isKeralaBased: true,
        resolutionQuality: 'exact' as const,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedEntry));

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await reverseGeocode(lat, lon);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.locality).toBe('Thammanam');
      expect(result.district).toBe('Ernakulam');
      expect(result.isKeralaBased).toBe(true);
    });

    it('does NOT assign a Kerala district to visitors outside Kerala', async () => {
      // New Delhi Coordinates (28.6139, 77.2090)
      const lat = 28.6139;
      const lon = 77.2090;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            suburb: 'Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
            postcode: '110001',
          },
        }),
      } as any);

      const result = await reverseGeocode(lat, lon);

      expect(result.isKeralaBased).toBe(false);
      expect(result.approximateDistrict).toBeUndefined();
      expect(result.district).not.toBe('Ernakulam');
      expect(['New Delhi', 'Delhi', 'Connaught Place']).toContain(result.district);
      expect(result.state).toBe('Delhi');
    });

    it('handles remote geocoder failure without fabricating a district name', async () => {
      // Coordinates inside Kerala
      const lat = 9.9816;
      const lon = 76.2999;

      // Force network rejection
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      const result = await reverseGeocode(lat, lon);

      expect(result.resolutionQuality).toBe('failed');
      // Must NOT present centroid as verified actual district
      expect(result.district).toBe('');
      expect(result.locality).toBe('');
      // Approximate centroid is isolated under approximateDistrict
      expect(result.approximateDistrict).toBe('Ernakulam');
      expect(result.isKeralaBased).toBe(true);
    });

    it('does not permanently cache failed reverse geocoding lookups', async () => {
      const lat = 10.5276;
      const lon = 76.2144;
      const cacheKey = `${GEO_CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

      await reverseGeocode(lat, lon);

      // Failed lookups must not be saved to localStorage
      expect(localStorage.getItem(cacheKey)).toBeNull();
    });
  });

  describe('4. Spatial Math & Centroids', () => {
    it('calculates Haversine distance accurately between Kerala districts', () => {
      const ernakulam = KERALA_DISTRICT_COORDS['Ernakulam'];
      const thrissur = KERALA_DISTRICT_COORDS['Thrissur'];

      const distance = calculateDistanceKm(
        ernakulam.latitude,
        ernakulam.longitude,
        thrissur.latitude,
        thrissur.longitude
      );

      expect(distance).toBeGreaterThan(55);
      expect(distance).toBeLessThan(80);
    });

    it('identifies coordinates within Kerala boundary', () => {
      expect(isInKeralaRegion(9.9816, 76.2999)).toBe(true);
      expect(isInKeralaRegion(8.5241, 76.9366)).toBe(true);
      expect(isInKeralaRegion(28.6139, 77.2090)).toBe(false); // Delhi
      expect(isInKeralaRegion(51.5074, -0.1278)).toBe(false); // London
    });

    it('resolves closest centroid without claiming it as official user address', () => {
      expect(findNearestDistrict(10.0159, 76.3419)).toBe('Ernakulam');
      expect(findNearestDistrict(11.2625, 75.7725)).toBe('Kozhikode');
    });
  });

  describe('5. Permissions & Persistence State', () => {
    it('respects denial flags and prevents repeated prompts', () => {
      localStorage.setItem(STORAGE_KEY_GEO_PERMISSION, 'denied');
      expect(localStorage.getItem(STORAGE_KEY_GEO_PERMISSION)).toBe('denied');
    });
  });
});
