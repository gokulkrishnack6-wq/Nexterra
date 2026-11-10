import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { PGlite } from '@electric-sql/pglite';
import { KERALA_WASTE_LOCATIONS_SEED } from '../src/data/keralaWasteLocationsSeed';
import {
  KERALA_DISTRICTS,
  KERALA_MUNICIPAL_BODIES,
  getMunicipalitiesByDistrict,
} from '../src/data/keralaAdministrativeData';
import {
  isLocationInDistrict,
  isLocationInMunicipality,
  getDistrictBounds,
} from '../src/services/mapSearchService';
import {
  calculateDistanceKm,
  isInKeralaRegion,
  matchKeralaDistrict,
} from '../src/contexts/LocationContext';
import { WasteLocation, WasteListing } from '../src/types';

describe('GreenLoop District-Wide Waste Location Filtering and Map Display Suite', () => {
  // ============================================================================
  // 1. ERNAKULAM DISTRICT COMPREHENSIVE FILTERING
  // ============================================================================
  describe('1. Ernakulam District Complete Coverage', () => {
    it('retrieves all locations in Ernakulam across all its municipalities', () => {
      const ernakulamLocations = KERALA_WASTE_LOCATIONS_SEED.filter((loc) =>
        isLocationInDistrict(loc, 'Ernakulam')
      );

      expect(ernakulamLocations.length).toBeGreaterThanOrEqual(50);

      // Verify Kalamassery bins & MCF appear
      const kalamasseryItems = ernakulamLocations.filter((l) =>
        isLocationInMunicipality(l, 'Kalamassery')
      );
      expect(kalamasseryItems.length).toBeGreaterThanOrEqual(2);
      expect(kalamasseryItems.some((l) => l.name.includes('Kalamassery'))).toBe(true);
      expect(kalamasseryItems.some((l) => l.location_type === 'public_bin')).toBe(true);
      expect(kalamasseryItems.some((l) => l.location_type === 'collection_centre')).toBe(true);

      // Verify Aluva bins & MCF appear
      const aluvaItems = ernakulamLocations.filter((l) =>
        isLocationInMunicipality(l, 'Aluva')
      );
      expect(aluvaItems.length).toBeGreaterThanOrEqual(2);
      expect(aluvaItems.some((l) => l.name.includes('Aluva'))).toBe(true);
      expect(aluvaItems.some((l) => l.location_type === 'public_bin')).toBe(true);
      expect(aluvaItems.some((l) => l.location_type === 'collection_centre')).toBe(true);

      // Verify Kochi Corporation locations appear
      const kochiItems = ernakulamLocations.filter((l) =>
        isLocationInMunicipality(l, 'Kochi')
      );
      expect(kochiItems.length).toBeGreaterThanOrEqual(5);

      // Verify Tripunithura, Angamaly, Perumbavoor, etc. appear
      const tripunithuraItems = ernakulamLocations.filter((l) =>
        isLocationInMunicipality(l, 'Tripunithura')
      );
      expect(tripunithuraItems.length).toBeGreaterThanOrEqual(1);

      const angamalyItems = ernakulamLocations.filter((l) =>
        isLocationInMunicipality(l, 'Angamaly')
      );
      expect(angamalyItems.length).toBeGreaterThanOrEqual(1);
    });

    it('displays all three location types together when All Locations is selected for Ernakulam', () => {
      const ernakulamLocations = KERALA_WASTE_LOCATIONS_SEED.filter((loc) =>
        isLocationInDistrict(loc, 'Ernakulam')
      );

      const bins = ernakulamLocations.filter((l) => l.location_type === 'public_bin');
      const centres = ernakulamLocations.filter((l) => l.location_type === 'collection_centre');

      expect(bins.length).toBeGreaterThanOrEqual(20);
      expect(centres.length).toBeGreaterThanOrEqual(15);
      expect(bins.length + centres.length).toBe(ernakulamLocations.length);
    });

    it('correctly associates locations having municipality in Ernakulam even if district string differs or is lowercase', () => {
      const testLoc1 = {
        name: 'Custom Baling Unit',
        municipality: 'Kalamassery',
        district: 'ernakulam',
        address: 'HMT Road, Kalamassery',
      };
      expect(isLocationInDistrict(testLoc1, 'Ernakulam')).toBe(true);

      // Vernacular alias "Kochi" as district
      const testLoc2 = {
        name: 'Fort Kochi Plastic Bin',
        municipality: 'Kochi',
        district: 'Kochi',
        address: 'Vasco Da Gama Square, Fort Kochi',
      };
      expect(isLocationInDistrict(testLoc2, 'Ernakulam')).toBe(true);

      // Municipality from Ernakulam with empty district field
      const testLoc3 = {
        name: 'Aluva Metro Station Bin',
        municipality: 'Aluva',
        district: '',
        address: 'Metro Station Entrance, Aluva',
      };
      expect(isLocationInDistrict(testLoc3, 'Ernakulam')).toBe(true);

      // Location in Kozhikode must NOT match Ernakulam
      const testLoc4 = {
        name: 'Mananchira Square Bin',
        municipality: 'Kozhikode',
        district: 'Kozhikode',
        address: 'Mananchira, Kozhikode',
      };
      expect(isLocationInDistrict(testLoc4, 'Ernakulam')).toBe(false);
    });
  });

  // ============================================================================
  // 2. MUNICIPALITY SELECTOR & TOGGLE BEHAVIOUR
  // ============================================================================
  describe('2. Municipality Selector Behavior', () => {
    it('filters strictly to Kalamassery when Kalamassery is chosen', () => {
      const ernakulamLocations = KERALA_WASTE_LOCATIONS_SEED.filter((loc) =>
        isLocationInDistrict(loc, 'Ernakulam')
      );

      const kalamasseryOnly = ernakulamLocations.filter((loc) =>
        isLocationInMunicipality(loc, 'Kalamassery')
      );

      expect(kalamasseryOnly.length).toBeGreaterThan(0);
      for (const loc of kalamasseryOnly) {
        const matchesMun = loc.municipality.toLowerCase() === 'kalamassery';
        const matchesAddr = loc.address.toLowerCase().includes('kalamassery');
        const matchesName = loc.name.toLowerCase().includes('kalamassery');
        expect(matchesMun || matchesAddr || matchesName).toBe(true);
      }

      // Must not include Aluva or Kochi
      expect(kalamasseryOnly.some((l) => l.municipality.toLowerCase() === 'aluva')).toBe(false);
    });

    it('restores all district locations when returning to "All in Ernakulam" or "All Municipalities"', () => {
      const ernakulamLocations = KERALA_WASTE_LOCATIONS_SEED.filter((loc) =>
        isLocationInDistrict(loc, 'Ernakulam')
      );

      const allInErnakulam = ernakulamLocations.filter((loc) =>
        isLocationInMunicipality(loc, 'All in Ernakulam')
      );
      expect(allInErnakulam.length).toBe(ernakulamLocations.length);

      const allMunicipalities = ernakulamLocations.filter((loc) =>
        isLocationInMunicipality(loc, 'All Municipalities')
      );
      expect(allMunicipalities.length).toBe(ernakulamLocations.length);
    });
  });

  // ============================================================================
  // 3. ALL 14 DISTRICTS COVERAGE & VERIFICATION
  // ============================================================================
  describe('3. All 14 Districts Verification', () => {
    const allDistricts = [
      'Kasaragod',
      'Kannur',
      'Wayanad',
      'Kozhikode',
      'Malappuram',
      'Palakkad',
      'Thrissur',
      'Ernakulam',
      'Idukki',
      'Kottayam',
      'Alappuzha',
      'Pathanamthitta',
      'Kollam',
      'Thiruvananthapuram',
    ];

    it('retrieves genuine waste locations for each of the 14 districts', () => {
      const countsPerDistrict: Record<string, { total: number; bins: number; centres: number }> = {};

      for (const district of allDistricts) {
        const matched = KERALA_WASTE_LOCATIONS_SEED.filter((loc) =>
          isLocationInDistrict(loc, district)
        );

        const bins = matched.filter((l) => l.location_type === 'public_bin').length;
        const centres = matched.filter((l) => l.location_type === 'collection_centre').length;

        countsPerDistrict[district] = { total: matched.length, bins, centres };

        expect(matched.length, `District ${district} should have locations`).toBeGreaterThanOrEqual(5);
        expect(bins + centres).toBe(matched.length);
      }

      // Check specific prominent districts
      expect(countsPerDistrict['Ernakulam'].total).toBeGreaterThanOrEqual(50);
      expect(countsPerDistrict['Thiruvananthapuram'].total).toBeGreaterThanOrEqual(40);
      expect(countsPerDistrict['Kozhikode'].total).toBeGreaterThanOrEqual(20);
      console.log('DISTRICT LOCATIONS BREAKDOWN:', JSON.stringify(countsPerDistrict, null, 2));
    });

    it('generates valid bounding boxes for all 14 districts', () => {
      for (const district of allDistricts) {
        const bounds = getDistrictBounds(district);
        expect(bounds, `Bounds for ${district} should exist`).not.toBeNull();
        if (bounds) {
          const [[minLat, minLng], [maxLat, maxLng]] = bounds;
          expect(minLat).toBeLessThan(maxLat);
          expect(minLng).toBeLessThan(maxLng);
          // Coordinates must be inside Kerala region
          expect(minLat).toBeGreaterThanOrEqual(8.0);
          expect(maxLat).toBeLessThanOrEqual(13.1);
          expect(minLng).toBeGreaterThanOrEqual(74.5);
          expect(maxLng).toBeLessThanOrEqual(77.8);
        }
      }
    });
  });

  // ============================================================================
  // 4. DISTANCE & OVERSEAS COORDINATE FIXES
  // ============================================================================
  describe('4. Distance and Coordinate Fixes', () => {
    it('calculates accurate Haversine distance for coordinates within Kerala', () => {
      // User in Kochi (9.9816, 76.2999) to Kalamassery (10.0512, 76.3216)
      const dist = calculateDistanceKm(9.9816, 76.2999, 10.0512, 76.3216);
      expect(dist).toBeGreaterThan(7);
      expect(dist).toBeLessThan(12); // ~8.1 km
    });

    it('correctly identifies coordinates within Kerala boundary from South to North', () => {
      // Parassala, Thiruvananthapuram (South)
      expect(isInKeralaRegion(8.28, 77.15)).toBe(true);

      // Kochi, Ernakulam (Central)
      expect(isInKeralaRegion(9.9816, 76.2999)).toBe(true);

      // Kasaragod (North)
      expect(isInKeralaRegion(12.4996, 74.9869)).toBe(true);

      // Manjeshwaram (Far North)
      expect(isInKeralaRegion(12.79, 74.88)).toBe(true);
    });

    it('strictly identifies coordinates outside Kerala (preventing 12,653 km bug)', () => {
      // New York / North America (~12,653 km from Kerala)
      expect(isInKeralaRegion(40.7128, -74.0060)).toBe(false);

      // Washington DC
      expect(isInKeralaRegion(38.9072, -77.0369)).toBe(false);

      // London, UK
      expect(isInKeralaRegion(51.5074, -0.1278)).toBe(false);

      // New Delhi, India
      expect(isInKeralaRegion(28.6139, 77.2090)).toBe(false);
    });

    it('nullifies distance calculation when user is outside Kerala or distance exceeds 500 km', () => {
      const userCoordsInUS = { latitude: 40.7128, longitude: -74.0060 };
      const kalamasseryLoc = { latitude: 10.0512, longitude: 76.3216 };

      const isUserInKerala = isInKeralaRegion(userCoordsInUS.latitude, userCoordsInUS.longitude);
      const computedDistance = isUserInKerala
        ? calculateDistanceKm(
            userCoordsInUS.latitude,
            userCoordsInUS.longitude,
            kalamasseryLoc.latitude,
            kalamasseryLoc.longitude
          )
        : null;

      expect(isUserInKerala).toBe(false);
      expect(computedDistance).toBeNull();
    });
  });

  // ============================================================================
  // 5. DATABASE MIGRATION INTEGRITY (PGlite)
  // ============================================================================
  describe('5. Database Migration Integrity', () => {
    it('executes the query optimization migration cleanly on PostgreSQL without errors', async () => {
      const db = new PGlite();

      // Create prerequisites
      await db.exec(`
        CREATE TABLE IF NOT EXISTS public.waste_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          location_type TEXT NOT NULL,
          facility_type TEXT NOT NULL,
          accepted_waste_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          description TEXT,
          address TEXT NOT NULL,
          district TEXT NOT NULL,
          municipality TEXT NOT NULL,
          pincode TEXT,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          verification_status TEXT NOT NULL DEFAULT 'officially_verified'
        );

        CREATE TABLE IF NOT EXISTS public.listings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          district TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Read and execute migration
      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110060000_district_waste_discovery_query_optimization.sql',
        'utf8'
      );

      await db.exec(migrationSql);

      // Verify indexes exist in PostgreSQL catalog
      const indexResult = await db.query<{ indexname: string }>(`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('waste_locations', 'listings')
        ORDER BY indexname;
      `);

      const indexNames = indexResult.rows.map((r) => r.indexname);
      expect(indexNames).toContain('idx_waste_locations_district_mun');
      expect(indexNames).toContain('idx_waste_locations_district_type');
      expect(indexNames).toContain('idx_listings_district_status');
    }, 30000);
  });
});
