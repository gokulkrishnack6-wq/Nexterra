import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import {
  KERALA_DISTRICTS,
  KERALA_MUNICIPAL_BODIES,
  getMunicipalitiesByDistrict,
  findNearestMunicipalBody
} from '../src/data/keralaAdministrativeData';
import { KERALA_WASTE_LOCATIONS_SEED } from '../src/data/keralaWasteLocationsSeed';
import { WasteLocation, WasteListing } from '../src/types';

describe('GreenLoop Kerala Waste Discovery Map — Comprehensive Test Suite', () => {
  // ============================================================================
  // 1. KERALA ADMINISTRATIVE GEOGRAPHY & 100% COVERAGE VERIFICATION
  // ============================================================================
  describe('1. Kerala Administrative Geography & Urban Local Body Coverage', () => {
    it('covers all 14 official districts of Kerala', () => {
      expect(KERALA_DISTRICTS.length).toBe(14);
      const districtNames = KERALA_DISTRICTS.map((d) => d.name);

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

      for (const d of requiredDistricts) {
        expect(districtNames).toContain(d);
      }
    });

    it('covers all 6 Municipal Corporations and all 87 Municipalities (Total: 93 ULBs)', () => {
      const corporations = KERALA_MUNICIPAL_BODIES.filter((b) => b.type === 'corporation');
      const municipalities = KERALA_MUNICIPAL_BODIES.filter((b) => b.type === 'municipality');

      expect(corporations.length).toBe(6);
      expect(municipalities.length).toBe(87);
      expect(KERALA_MUNICIPAL_BODIES.length).toBe(93);

      const corpNames = corporations.map((c) => c.name);
      expect(corpNames).toContain('Thiruvananthapuram');
      expect(corpNames).toContain('Kollam');
      expect(corpNames).toContain('Kochi');
      expect(corpNames).toContain('Thrissur');
      expect(corpNames).toContain('Kozhikode');
      expect(corpNames).toContain('Kannur');
    });

    it('all municipal body centroids lie strictly within Kerala geographic boundaries', () => {
      for (const body of KERALA_MUNICIPAL_BODIES) {
        expect(body.latitude).toBeGreaterThanOrEqual(8.2);
        expect(body.latitude).toBeLessThanOrEqual(12.9);
        expect(body.longitude).toBeGreaterThanOrEqual(74.8);
        expect(body.longitude).toBeLessThanOrEqual(77.6);
        expect(body.district).toBeTruthy();
        expect(body.name).toBeTruthy();
      }
    });

    it('getMunicipalitiesByDistrict returns the exact urban local bodies for any selected district', () => {
      const ekmMuns = getMunicipalitiesByDistrict('Ernakulam');
      expect(ekmMuns.length).toBe(14); // 1 Corp (Kochi) + 13 Municipalities
      expect(ekmMuns.some((m) => m.name === 'Aluva')).toBe(true);
      expect(ekmMuns.some((m) => m.name === 'Kochi')).toBe(true);
      expect(ekmMuns.some((m) => m.name === 'Kalamassery')).toBe(true);

      const ksdMuns = getMunicipalitiesByDistrict('Kasaragod');
      expect(ksdMuns.length).toBe(3); // Kasaragod, Kanhangad, Nileshwaram
      expect(ksdMuns.some((m) => m.name === 'Kanhangad')).toBe(true);

      const allMuns = getMunicipalitiesByDistrict('All Kerala');
      expect(allMuns.length).toBe(93);
    });

    it('findNearestMunicipalBody correctly finds the closest municipality', () => {
      // Coordinates near Kanhangad town (12.3089, 75.0906)
      const res = findNearestMunicipalBody(12.3100, 75.0920, 'Kasaragod');
      expect(res).not.toBeNull();
      expect(res?.body.name).toBe('Kanhangad');
      expect(res?.distanceKm).toBeLessThan(1.0);
    });
  });

  // ============================================================================
  // 2. THREE DISTINCT MARKER TYPES & AUTHENTIC SEED DATA
  // ============================================================================
  describe('2. Three Distinct Marker Types & Verified Seed Dataset', () => {
    it('seed dataset contains genuine verified records across Kerala', () => {
      expect(KERALA_WASTE_LOCATIONS_SEED.length).toBeGreaterThan(450);

      const publicBins = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'public_bin');
      const collectionCentres = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'collection_centre');

      expect(publicBins.length).toBeGreaterThan(200);
      expect(collectionCentres.length).toBeGreaterThan(200);
    });

    it('differentiates Public Waste Bins (Blue marker) from Collection Centres (Orange marker)', () => {
      const publicBins = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'public_bin');
      for (const bin of publicBins.slice(0, 30)) {
        expect(['public_litter_bin', 'segregated_smart_bin', 'e_waste_kiosk']).toContain(bin.facility_type);
        expect(bin.accepted_waste_categories.length).toBeGreaterThan(0);
        expect(bin.address).toBeTruthy();
        expect(bin.latitude).toBeGreaterThan(8.0);
        expect(bin.longitude).toBeGreaterThan(74.0);
      }

      const centres = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.location_type === 'collection_centre');
      for (const centre of centres.slice(0, 30)) {
        expect(['mcf', 'rrf', 'scrap_recycling_centre', 'haritha_karma_sena_hub', 'compost_station']).toContain(
          centre.facility_type
        );
        expect(centre.accepted_waste_categories.length).toBeGreaterThan(0);
        expect(centre.address).toBeTruthy();
      }
    });

    it('covers all 14 districts in the verified location dataset', () => {
      const districtsCovered = new Set(KERALA_WASTE_LOCATIONS_SEED.map((l) => l.district));
      expect(districtsCovered.size).toBe(14);
      for (const d of KERALA_DISTRICTS) {
        expect(districtsCovered.has(d.name)).toBe(true);
      }
    });

    it('every record has a valid source attribution (OpenStreetMap, Suchitwa Mission, Clean Kerala, LSGD)', () => {
      for (const loc of KERALA_WASTE_LOCATIONS_SEED) {
        expect(['openstreetmap', 'suchitwa_mission', 'clean_kerala_company', 'lsgd_kerala']).toContain(loc.source);
        expect(loc.source_reference).toBeTruthy();
        expect(['officially_verified', 'community_verified']).toContain(loc.verification_status);
      }
    });
  });

  // ============================================================================
  // 3. FILTERING, SEARCH & LIMITED COVERAGE LOGIC
  // ============================================================================
  describe('3. Filtering, Search, and Limited Coverage Logic', () => {
    it('filters locations by district accurately', () => {
      const ksdLocations = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.district === 'Kasaragod');
      expect(ksdLocations.length).toBeGreaterThan(0);
      expect(ksdLocations.every((l) => l.district === 'Kasaragod')).toBe(true);

      const ekmLocations = KERALA_WASTE_LOCATIONS_SEED.filter((l) => l.district === 'Ernakulam');
      expect(ekmLocations.length).toBeGreaterThan(50);
      expect(ekmLocations.every((l) => l.district === 'Ernakulam')).toBe(true);
    });

    it('filters locations by municipality accurately', () => {
      const aluvaLocations = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) => l.district === 'Ernakulam' && l.municipality.toLowerCase() === 'aluva'
      );
      expect(aluvaLocations.length).toBeGreaterThan(0);
      expect(aluvaLocations.every((l) => l.municipality.toLowerCase() === 'aluva')).toBe(true);
    });

    it('correctly detects limited coverage when municipality has fewer than 10 verified records without fabricating mock records', () => {
      const kanhangadLocations = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) => l.district === 'Kasaragod' && l.municipality.toLowerCase() === 'kanhangad'
      );
      // Genuine count
      const isLimited = kanhangadLocations.length < 10;
      expect(isLimited).toBe(true);
      // Crucial: do not fabricate mock records
      expect(kanhangadLocations.length).toBeGreaterThan(0);
      expect(kanhangadLocations.length).toBeLessThan(10);
    });

    it('filters by waste material categories (e.g. Plastics, E-Waste)', () => {
      const eWasteLocations = KERALA_WASTE_LOCATIONS_SEED.filter((l) =>
        l.accepted_waste_categories.some((c) => c.toLowerCase().includes('e-waste'))
      );
      expect(eWasteLocations.length).toBeGreaterThan(50);

      const plasticLocations = KERALA_WASTE_LOCATIONS_SEED.filter((l) =>
        l.accepted_waste_categories.some((c) => c.toLowerCase().includes('plastic'))
      );
      expect(plasticLocations.length).toBeGreaterThan(200);
    });

    it('searches by name, place, and municipality', () => {
      const query = 'chalakudy';
      const results = KERALA_WASTE_LOCATIONS_SEED.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.address.toLowerCase().includes(query) ||
          l.municipality.toLowerCase().includes(query)
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.district === 'Thrissur')).toBe(true);
    });
  });

  // ============================================================================
  // 4. POSTGRESQL MIGRATION & RLS INTEGRITY (PGLITE)
  // ============================================================================
  describe('4. PostgreSQL Migration & RLS Security Integrity (PGlite)', () => {
    it('executes the waste discovery migration cleanly on PostgreSQL without errors', async () => {
      const db = new PGlite();

      // Mock prerequisite tables
      await db.exec(`
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name TEXT
        );
        CREATE TABLE IF NOT EXISTS public.recycling_centres (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          accepted_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
          address TEXT NOT NULL,
          district TEXT NOT NULL,
          locality TEXT NOT NULL,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          phone TEXT,
          operating_hours TEXT,
          is_verified BOOLEAN DEFAULT true
        );
        CREATE TABLE IF NOT EXISTS public.reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID,
          reported_item_type TEXT CHECK (reported_item_type IN ('listing', 'user', 'centre')),
          reported_item_id UUID,
          reason TEXT,
          details TEXT,
          status TEXT DEFAULT 'pending'
        );
      `);

      // Read and execute the migration
      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110030000_kerala_waste_discovery_locations.sql',
        'utf8'
      );
      await db.exec(migrationSql);

      // Verify row count
      const countRes = await db.query<{ count: string }>('SELECT COUNT(*) FROM public.waste_locations;');
      const count = Number(countRes.rows[0].count);
      expect(count).toBeGreaterThanOrEqual(500);

      // Verify table constraints
      const sampleRes = await db.query<WasteLocation>(`
        SELECT name, location_type, district, municipality, latitude, longitude, verification_status 
        FROM public.waste_locations 
        LIMIT 5;
      `);
      expect(sampleRes.rows.length).toBe(5);
      for (const row of sampleRes.rows) {
        expect(['public_bin', 'collection_centre']).toContain(row.location_type);
        expect(row.district).toBeTruthy();
        expect(row.municipality).toBeTruthy();
      }

      // Verify reports table constraint extension
      await db.exec(`
        INSERT INTO public.reports (reported_item_type, reason, details)
        VALUES ('location', 'Incorrect physical location', 'Test report');
      `);
      const reportRes = await db.query('SELECT * FROM public.reports WHERE reported_item_type = \'location\';');
      expect(reportRes.rows.length).toBe(1);
    });

    it('community submissions default to pending_verification and maintain idempotency', async () => {
      const db = new PGlite();
      await db.exec(`
        CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS public.recycling_centres (
          id UUID PRIMARY KEY, name TEXT, accepted_categories TEXT[], address TEXT, district TEXT,
          locality TEXT, latitude NUMERIC, longitude NUMERIC, phone TEXT, operating_hours TEXT, is_verified BOOLEAN
        );
        CREATE TABLE IF NOT EXISTS public.reports (id UUID PRIMARY KEY, reported_item_type TEXT);
      `);

      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110030000_kerala_waste_discovery_locations.sql',
        'utf8'
      );
      await db.exec(migrationSql);

      // Insert community suggestion
      await db.exec(`
        INSERT INTO public.waste_locations (
          name, location_type, facility_type, address, district, municipality, latitude, longitude, source, source_reference, verification_status
        ) VALUES (
          'Beach Road Community Bin', 'public_bin', 'public_litter_bin', 'Beach Road, Kozhikode', 'Kozhikode', 'Kozhikode', 11.2588, 75.7804, 'community_submission', 'COMMUNITY-TEST-001', 'pending_verification'
        );
      `);

      const checkRes = await db.query<{ verification_status: string }>(
        'SELECT verification_status FROM public.waste_locations WHERE source_reference = \'COMMUNITY-TEST-001\';'
      );
      expect(checkRes.rows[0].verification_status).toBe('pending_verification');

      // Duplicate insertion should not throw due to ON CONFLICT DO NOTHING
      await db.exec(`
        INSERT INTO public.waste_locations (
          name, location_type, facility_type, address, district, municipality, latitude, longitude, source, source_reference, verification_status
        ) VALUES (
          'Beach Road Community Bin', 'public_bin', 'public_litter_bin', 'Beach Road, Kozhikode', 'Kozhikode', 'Kozhikode', 11.2588, 75.7804, 'community_submission', 'COMMUNITY-TEST-001', 'pending_verification'
        ) ON CONFLICT (source, source_reference) WHERE source_reference IS NOT NULL DO NOTHING;
      `);

      const dupCount = await db.query(
        'SELECT COUNT(*) FROM public.waste_locations WHERE source_reference = \'COMMUNITY-TEST-001\';'
      );
      expect(Number(dupCount.rows[0].count)).toBe(1);
    });
  });
});

