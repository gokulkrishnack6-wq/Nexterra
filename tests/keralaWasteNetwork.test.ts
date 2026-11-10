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
  generateMapSearchSuggestions,
  getDistrictBounds,
  computeListingBounds,
  mergeWasteLocations,
} from '../src/services/mapSearchService';
import { WasteLocation, WasteListing } from '../src/types';

describe('GreenLoop Kerala-Wide Waste Location Network Test Suite', () => {
  // ============================================================================
  // 1. ALL 14 DISTRICTS COVERAGE & AUTHENTIC LOCATIONS
  // ============================================================================
  describe('1. 14 Districts & Municipalities Coverage', () => {
    const requiredDistricts = [
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

    it('covers all 14 districts of Kerala without exception', () => {
      const districtsInSeed = new Set(KERALA_WASTE_LOCATIONS_SEED.map((l) => l.district));
      for (const district of requiredDistricts) {
        expect(districtsInSeed.has(district), `Missing district: ${district}`).toBe(true);
      }
      expect(districtsInSeed.size).toBe(14);
    });

    it('has at least one city or municipality in every district with verified locations', () => {
      for (const district of requiredDistricts) {
        const locationsInDistrict = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.district === district);
        expect(locationsInDistrict.length).toBeGreaterThan(0);

        const municipalities = new Set(locationsInDistrict.map((l) => l.municipality));
        expect(municipalities.size).toBeGreaterThan(0);

        // Verify valid GPS coordinates inside Kerala geographic bounding box
        for (const loc of locationsInDistrict) {
          expect(loc.latitude).toBeGreaterThanOrEqual(8.1);
          expect(loc.latitude).toBeLessThanOrEqual(12.9);
          expect(loc.longitude).toBeGreaterThanOrEqual(74.8);
          expect(loc.longitude).toBeLessThanOrEqual(77.6);
        }
      }
    });

    it('has multiple public waste bins in key Kerala cities', () => {
      // Kochi (Ernakulam)
      const kochiBins = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) => l.district === 'Ernakulam' && l.location_type === 'public_bin'
      );
      expect(kochiBins.length).toBeGreaterThanOrEqual(5);

      // Thiruvananthapuram
      const tvmBins = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) => l.district === 'Thiruvananthapuram' && l.location_type === 'public_bin'
      );
      expect(tvmBins.length).toBeGreaterThanOrEqual(10);

      // Kannur
      const kannurBins = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) => l.district === 'Kannur' && l.location_type === 'public_bin'
      );
      expect(kannurBins.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================================
  // 2. THREE DISTINCT LOCATION TYPES & DATA ATTRIBUTES
  // ============================================================================
  describe('2. Three Distinct Location Types & Integrity', () => {
    it('contains verified Public Waste Bins (Blue circular marker)', () => {
      const bins = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'public_bin');
      expect(bins.length).toBeGreaterThanOrEqual(200);

      for (const bin of bins.slice(0, 20)) {
        expect(bin.name).toBeTruthy();
        expect(bin.address).toBeTruthy();
        expect(bin.accepted_waste_categories.length).toBeGreaterThan(0);
        expect(['lsgd_kerala', 'suchitwa_mission', 'clean_kerala_company', 'openstreetmap']).toContain(bin.source);
      }
    });

    it('contains verified Collection & Recycling Centres (Orange circular marker)', () => {
      const centres = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'collection_centre');
      expect(centres.length).toBeGreaterThanOrEqual(200);

      for (const centre of centres.slice(0, 20)) {
        expect(centre.name).toBeTruthy();
        expect(centre.address).toBeTruthy();
        expect(centre.accepted_waste_categories.length).toBeGreaterThan(0);
      }
    });

    it('restores the 5 legacy public bins (Marine Drive, Panampilly Nagar, etc.)', () => {
      const legacyIds = ['bin-1', 'bin-2', 'bin-3', 'bin-4', 'bin-5'];
      for (const id of legacyIds) {
        const found = KERALA_WASTE_LOCATIONS_SEED.find((l) => l.id === id);
        expect(found, `Legacy bin ${id} should be restored in seed dataset`).toBeDefined();
        expect(found?.location_type).toBe('public_bin');
        expect(found?.verification_status).toBe('officially_verified');
      }
    });
  });

  // ============================================================================
  // 3. DATA MERGING & RESTORATION SAFEGUARD
  // ============================================================================
  describe('3. mergeWasteLocations Data Integrity Guard', () => {
    it('prevents partial database fetch from wiping out full Kerala seed dataset', () => {
      const partialDbResponse: WasteLocation[] = [
        {
          id: 'test-db-1',
          name: 'Custom Community Bin',
          location_type: 'public_bin',
          facility_type: 'public_litter_bin',
          accepted_waste_categories: ['Plastics'],
          address: 'Main Road, Kozhikode',
          district: 'Kozhikode',
          municipality: 'Kozhikode',
          latitude: 11.2588,
          longitude: 75.7804,
          source: 'community_submission',
          source_reference: 'COMMUNITY-001',
          verification_status: 'pending_verification',
        },
      ];

      // Merging 1 DB record with 500+ seed locations MUST preserve all 500+ seed locations!
      const merged = mergeWasteLocations(KERALA_WASTE_LOCATIONS_SEED, partialDbResponse);
      expect(merged.length).toBe(KERALA_WASTE_LOCATIONS_SEED.length + 1);

      // Verify the new community submission is included
      const found = merged.find((l) => l.id === 'test-db-1');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Custom Community Bin');

      // Verify all 14 districts remain covered
      const districts = new Set(merged.map((l) => l.district));
      expect(districts.size).toBe(14);
    });

    it('updates matching seed records when updated in database without duplicating', () => {
      const updatedSeedBin: WasteLocation = {
        ...KERALA_WASTE_LOCATIONS_SEED[0],
        name: 'Updated Chalakudy Bin Name',
        verification_status: 'officially_verified',
      };

      const merged = mergeWasteLocations(KERALA_WASTE_LOCATIONS_SEED, [updatedSeedBin]);
      expect(merged.length).toBe(KERALA_WASTE_LOCATIONS_SEED.length);

      const found = merged.find((l) => l.id === KERALA_WASTE_LOCATIONS_SEED[0].id);
      expect(found?.name).toBe('Updated Chalakudy Bin Name');
    });
  });

  // ============================================================================
  // 4. SMART LOCATION SEARCH WITH AUTOCOMPLETE & BOUNDS
  // ============================================================================
  describe('4. Smart Location Search & Map Autocomplete', () => {
    const mockListings: WasteListing[] = [
      {
        id: 'list-plastic-1',
        title: 'Clean Plastic PET Bottles',
        description: 'Baled PET water bottles ready for recycling pickup',
        category_id: 'plastics',
        category: { id: 'plastics', name: 'Plastics', slug: 'plastics' } as any,
        district: 'Kasaragod',
        locality: 'Kanhangad',
        latitude: 12.3155,
        longitude: 75.0931,
        status: 'active',
        listing_type: 'free',
        quantity: 25,
        unit: 'kg',
      } as any,
      {
        id: 'list-cardboard-1',
        title: 'Corrugated Cardboard Sheets',
        description: 'Clean brown packing boxes and cardboard',
        category_id: 'paper',
        category: { id: 'paper', name: 'Paper & Cardboard', slug: 'paper' } as any,
        district: 'Ernakulam',
        locality: 'Kochi',
        latitude: 9.9816,
        longitude: 76.2999,
        status: 'active',
        listing_type: 'free',
        quantity: 50,
        unit: 'kg',
      } as any,
    ];

    it('suggests matching city and district when searching "Kanhangad"', () => {
      const suggestions = generateMapSearchSuggestions('Kanhangad', KERALA_WASTE_LOCATIONS_SEED, mockListings);
      expect(suggestions.length).toBeGreaterThan(0);

      const munSug = suggestions.find((s) => s.type === 'municipality' && s.title === 'Kanhangad');
      expect(munSug).toBeDefined();
      expect(munSug?.district).toBe('Kasaragod');
      expect(munSug?.latitude).toBeCloseTo(12.3155, 1);
    });

    it('suggests matching district when searching "Kasaragod"', () => {
      const suggestions = generateMapSearchSuggestions('Kasaragod', KERALA_WASTE_LOCATIONS_SEED, mockListings);
      const distSug = suggestions.find((s) => s.type === 'district' && s.title === 'Kasaragod');
      expect(distSug).toBeDefined();
      expect(distSug?.bounds).toBeDefined();
    });

    it('suggests waste material listings when searching "Plastic"', () => {
      const suggestions = generateMapSearchSuggestions('Plastic', KERALA_WASTE_LOCATIONS_SEED, mockListings);
      const matSug = suggestions.find((s) => s.type === 'material');
      expect(matSug).toBeDefined();
      expect(matSug?.listingCount).toBeGreaterThan(0);
    });

    it('suggests public waste bins when searching "Public Bin"', () => {
      const suggestions = generateMapSearchSuggestions('Public Bin', KERALA_WASTE_LOCATIONS_SEED, mockListings);
      expect(suggestions.some((s) => s.type === 'public_bin')).toBe(true);
    });

    it('computes accurate district bounding box for map zoom', () => {
      const ekmBounds = getDistrictBounds('Ernakulam');
      expect(ekmBounds).not.toBeNull();
      expect(ekmBounds![0][0]).toBeLessThan(ekmBounds![1][0]); // minLat < maxLat
      expect(ekmBounds![0][1]).toBeLessThan(ekmBounds![1][1]); // minLng < maxLng
    });

    it('computes accurate listing bounds for material search', () => {
      const bounds = computeListingBounds(mockListings);
      expect(bounds).not.toBeNull();
      // Should encompass both Kasaragod (12.3155) and Ernakulam (9.9816)
      expect(bounds![0][0]).toBeLessThanOrEqual(9.9816);
      expect(bounds![1][0]).toBeGreaterThanOrEqual(12.3155);
    });
  });

  // ============================================================================
  // 5. POSTGRESQL MIGRATION & RLS INTEGRITY (PGlite)
  // ============================================================================
  describe('5. Database Migration & RLS Policy Integrity', () => {
    it('executes the network expansion migration cleanly on PostgreSQL', async () => {
      const db = new PGlite();
      await db.exec(`
        CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS public.recycling_centres (
          id UUID PRIMARY KEY, name TEXT, accepted_categories TEXT[], address TEXT, district TEXT,
          locality TEXT, latitude NUMERIC, longitude NUMERIC, phone TEXT, operating_hours TEXT, is_verified BOOLEAN
        );
        CREATE TABLE IF NOT EXISTS public.reports (id UUID PRIMARY KEY, reported_item_type TEXT, reason TEXT, details TEXT);
      `);

      // Run base migration
      const baseMigration = fs.readFileSync(
        'supabase/migrations/20261110030000_kerala_waste_discovery_locations.sql',
        'utf8'
      );
      await db.exec(baseMigration);

      // Run expansion migration
      const expansionMigration = fs.readFileSync(
        'supabase/migrations/20261110050000_kerala_waste_network_expansion.sql',
        'utf8'
      );
      await db.exec(expansionMigration);

      // Verify columns added
      const colsRes = await db.query<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'waste_locations' AND column_name IN ('photo_url', 'source_information');
      `);
      expect(colsRes.rows.map((r) => r.column_name)).toContain('photo_url');
      expect(colsRes.rows.map((r) => r.column_name)).toContain('source_information');

      // Verify legacy bins inserted
      const legacyRes = await db.query<{ count: string }>(`
        SELECT COUNT(*) FROM public.waste_locations WHERE source_reference IN ('KMC-BIN-001', 'SM-BIN-002', 'CKC-BIN-003', 'PTM-BIN-004', 'SM-BIN-005');
      `);
      expect(Number(legacyRes.rows[0].count)).toBe(5);
    }, 30000);
  });
});
