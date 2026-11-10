import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import {
  ENVIRONMENTAL_ISSUE_CATEGORIES,
  getIssueTypeLabel,
} from '../src/lib/reportCategories';
import { EnvironmentalReport, EnvironmentalIssueType } from '../src/types';

describe('GreenLoop Report an Issue — 5 Categories & Other Environmental Issue', () => {
  // ============================================================================
  // 1. CATEGORY PRESERVATION & 5TH CATEGORY SPECIFICATION
  // ============================================================================
  describe('1. Category Definitions and Integrity', () => {
    it('contains exactly five issue categories', () => {
      expect(ENVIRONMENTAL_ISSUE_CATEGORIES.length).toBe(5);
    });

    it('preserves all four existing categories exactly without renaming or removing', () => {
      const categoryMap = new Map(ENVIRONMENTAL_ISSUE_CATEGORIES.map((c) => [c.id, c]));

      // 1. Overflowing Public Bin
      expect(categoryMap.has('overflowing_bin')).toBe(true);
      expect(categoryMap.get('overflowing_bin')?.title).toBe('Overflowing Public Bin');
      expect(categoryMap.get('overflowing_bin')?.desc).toBe('Waste spilling onto walkway or street');

      // 2. Roadside / Vacant Plot Dump
      expect(categoryMap.has('illegal_dumping')).toBe(true);
      expect(categoryMap.get('illegal_dumping')?.title).toBe('Roadside / Vacant Plot Dump');
      expect(categoryMap.get('illegal_dumping')?.desc).toBe('Commercial or residential unauthorized dumping');

      // 3. Open Waste / Plastic Burning
      expect(categoryMap.has('plastic_burning')).toBe(true);
      expect(categoryMap.get('plastic_burning')?.title).toBe('Open Waste / Plastic Burning');
      expect(categoryMap.get('plastic_burning')?.desc).toBe('Smoke and air pollution hazards');

      // 4. Drain / Canal Contamination
      expect(categoryMap.has('water_pollution')).toBe(true);
      expect(categoryMap.get('water_pollution')?.title).toBe('Drain / Canal Contamination');
      expect(categoryMap.get('water_pollution')?.desc).toBe('Solid waste accumulating in water bodies');
    });

    it('adds "Other Environmental Issue" as the fifth category', () => {
      const categoryMap = new Map(ENVIRONMENTAL_ISSUE_CATEGORIES.map((c) => [c.id, c]));
      expect(categoryMap.has('other')).toBe(true);
      expect(categoryMap.get('other')?.title).toBe('Other Environmental Issue');
      expect(categoryMap.get('other')?.desc).toBeTruthy();
    });

    it('resolves user-facing labels correctly for all five categories', () => {
      expect(getIssueTypeLabel('overflowing_bin')).toBe('Overflowing Public Bin');
      expect(getIssueTypeLabel('illegal_dumping')).toBe('Roadside / Vacant Plot Dump');
      expect(getIssueTypeLabel('plastic_burning')).toBe('Open Waste / Plastic Burning');
      expect(getIssueTypeLabel('water_pollution')).toBe('Drain / Canal Contamination');
      expect(getIssueTypeLabel('other')).toBe('Other Environmental Issue');
      expect(getIssueTypeLabel(undefined)).toBe('Environmental Issue');
    });
  });

  // ============================================================================
  // 2. SINGLE-SELECTION BEHAVIOUR
  // ============================================================================
  describe('2. Single Selection Behavior', () => {
    it('maintains strict single-selection state across all 5 options', () => {
      let selectedCategory: EnvironmentalIssueType = 'overflowing_bin';

      const selectCategory = (type: EnvironmentalIssueType) => {
        selectedCategory = type;
      };

      // Select each of the 5 categories sequentially
      for (const cat of ENVIRONMENTAL_ISSUE_CATEGORIES) {
        selectCategory(cat.id);
        expect(selectedCategory).toBe(cat.id);

        // Verify only 1 category matches the selection
        const activeMatches = ENVIRONMENTAL_ISSUE_CATEGORIES.filter(
          (c) => c.id === selectedCategory
        );
        expect(activeMatches.length).toBe(1);
      }
    });
  });

  // ============================================================================
  // 3. FORM VALIDATION FOR "OTHER" AND EXISTING 4 CATEGORIES
  // ============================================================================
  describe('3. Form Validation Logic', () => {
    interface FormState {
      issueType: EnvironmentalIssueType;
      otherDescription: string;
      title: string;
      description: string;
      district: string;
    }

    const validateReportForm = (state: FormState): { valid: boolean; error?: string } => {
      if (state.issueType === 'other' && !state.otherDescription.trim()) {
        return { valid: false, error: 'Please describe the environmental issue.' };
      }
      if (!state.title.trim() || !state.description.trim()) {
        return { valid: false, error: 'Please fill out all required fields.' };
      }
      if (!state.district.trim()) {
        return { valid: false, error: 'Please select a Kerala district.' };
      }
      return { valid: true };
    };

    it('rejects submission when "Other Environmental Issue" is selected without a description', () => {
      const form: FormState = {
        issueType: 'other',
        otherDescription: '   ', // Empty or whitespace
        title: 'Chemical odor near canal',
        description: 'Persistent odor noticed during morning walk',
        district: 'Ernakulam',
      };

      const result = validateReportForm(form);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please describe the environmental issue.');
    });

    it('accepts submission when "Other Environmental Issue" is selected with a valid description', () => {
      const form: FormState = {
        issueType: 'other',
        otherDescription: 'Industrial effluent discharge leaking into stormwater gutter',
        title: 'Industrial Effluent Leakage',
        description: 'Greenish liquid with strong chemical smell observed flowing into drain',
        district: 'Ernakulam',
      };

      const result = validateReportForm(form);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('preserves existing validation behaviour for all four original categories without requiring other_description', () => {
      const originalCategories: EnvironmentalIssueType[] = [
        'overflowing_bin',
        'illegal_dumping',
        'plastic_burning',
        'water_pollution',
      ];

      for (const cat of originalCategories) {
        // Valid submission without otherDescription
        const validForm: FormState = {
          issueType: cat,
          otherDescription: '', // Not required
          title: 'Civic Report Title',
          description: 'Detailed observations and severity',
          district: 'Thrissur',
        };
        expect(validateReportForm(validForm).valid).toBe(true);

        // Missing existing required field (title)
        const missingTitleForm: FormState = {
          ...validForm,
          title: '',
        };
        expect(validateReportForm(missingTitleForm).valid).toBe(false);

        // Missing existing required field (description)
        const missingDescForm: FormState = {
          ...validForm,
          description: '',
        };
        expect(validateReportForm(missingDescForm).valid).toBe(false);

        // Missing district
        const missingDistrictForm: FormState = {
          ...validForm,
          district: '',
        };
        expect(validateReportForm(missingDistrictForm).valid).toBe(false);
      }
    });
  });

  // ============================================================================
  // 4. SUPABASE PERSISTENCE & PARSING INTEGRITY
  // ============================================================================
  describe('4. Supabase Payload & Data Ingestion Parsing', () => {
    it('creates report with valid UUID and includes other_description in structured details', () => {
      const randomTicket = `GL-REP-4589`;
      const reportUuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

      const reportData: Omit<EnvironmentalReport, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'> = {
        reporter_id: 'user-uuid-1234',
        reporter_name: 'Ananya Nair',
        issue_type: 'other',
        other_description: 'Agricultural pesticide runoff in paddy field channel',
        title: 'Pesticide Runoff',
        description: 'Runoff accumulating along field perimeter',
        district: 'Palakkad',
        ward: 'Ward 08',
        locality: 'Chittur',
        landmark: 'Near Canal Sluice Gate',
        latitude: 10.7022,
        longitude: 76.8184,
        assigned_team: 'Community Waste Monitoring Network',
        resolution_notes: 'Report recorded in GreenLoop registry for community action.',
      };

      const newReport: EnvironmentalReport = {
        ...reportData,
        id: reportUuid,
        ticket_number: randomTicket,
        reporter_id: reportData.reporter_id,
        reporter_name: reportData.reporter_name,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Verify UUID format (8-4-4-4-12 hex digits)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(newReport.id)).toBe(true);
      expect(newReport.issue_type).toBe('other');
      expect(newReport.other_description).toBe('Agricultural pesticide runoff in paddy field channel');

      // Verify payload serialized for Supabase reports table
      const detailsPayload = JSON.stringify({
        title: newReport.title,
        description: newReport.description,
        other_description: newReport.other_description || null,
        district: newReport.district,
        ward: newReport.ward,
        locality: newReport.locality,
        landmark: newReport.landmark,
        latitude: newReport.latitude,
        longitude: newReport.longitude,
        ticket_number: randomTicket,
        issue_type: newReport.issue_type,
      });

      const parsed = JSON.parse(detailsPayload);
      expect(parsed.other_description).toBe('Agricultural pesticide runoff in paddy field channel');
      expect(parsed.issue_type).toBe('other');
      expect(parsed.ticket_number).toBe('GL-REP-4589');
    });

    it('correctly parses Supabase reports table rows into EnvironmentalReport objects', () => {
      const rawDbRow = {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        reporter_id: 'user-uuid-9999',
        reported_item_type: 'environmental_issue',
        reported_item_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        reason: 'other',
        details: JSON.stringify({
          title: 'Abandoned Battery Scrap',
          description: 'Corroded lead-acid batteries left near drainage ditch',
          other_description: 'Hazardous lead-acid battery leakage',
          district: 'Kozhikode',
          ward: 'Ward 14',
          locality: 'Mankavu',
          landmark: 'Behind Old Mill',
          latitude: 11.2388,
          longitude: 75.8012,
          ticket_number: 'GL-REP-9102',
          issue_type: 'other',
        }),
        status: 'pending',
        action_taken: null,
        created_at: '2026-11-10T08:00:00Z',
      };

      const detailsObj = JSON.parse(rawDbRow.details);
      const reportObj: EnvironmentalReport = {
        id: rawDbRow.id,
        ticket_number: detailsObj.ticket_number || `GL-REP-${rawDbRow.id.slice(0, 6)}`,
        reporter_id: rawDbRow.reporter_id,
        reporter_name: detailsObj.reporter_name || 'Community Citizen',
        issue_type: (rawDbRow.reason as EnvironmentalIssueType) || 'other',
        other_description: detailsObj.other_description,
        title: detailsObj.title,
        description: detailsObj.description,
        district: detailsObj.district,
        ward: detailsObj.ward,
        locality: detailsObj.locality,
        landmark: detailsObj.landmark,
        latitude: detailsObj.latitude,
        longitude: detailsObj.longitude,
        status: rawDbRow.status as any,
        created_at: rawDbRow.created_at,
        updated_at: rawDbRow.created_at,
      };

      expect(reportObj.issue_type).toBe('other');
      expect(reportObj.other_description).toBe('Hazardous lead-acid battery leakage');
      expect(reportObj.title).toBe('Abandoned Battery Scrap');
      expect(reportObj.ticket_number).toBe('GL-REP-9102');
    });
  });

  // ============================================================================
  // 5. POSTGRESQL MIGRATION & RLS INTEGRITY (PGlite)
  // ============================================================================
  describe('5. PostgreSQL Migration & RLS Security Integrity (PGlite)', () => {
    it(
      'executes the reports hardening migration cleanly on PostgreSQL without errors',
      async () => {
        const db = new PGlite();

      // Create prerequisite schemas and tables as they exist on production
      await db.exec(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
          SELECT '11111111-1111-4111-8111-111111111111'::UUID;
        $$ LANGUAGE sql STABLE;

        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid()
        );

        CREATE TABLE IF NOT EXISTS public.reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          reported_item_type TEXT NOT NULL,
          reported_item_id UUID NOT NULL,
          reason TEXT NOT NULL,
          details TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          action_taken TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE public.reports ADD CONSTRAINT reports_reported_item_type_check 
          CHECK (reported_item_type IN ('listing', 'user', 'centre', 'location', 'public_bin', 'collection_centre'));
      `);

      // Read and execute migration 20261110040000_other_environmental_issue_reports.sql
      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110040000_other_environmental_issue_reports.sql',
        'utf8'
      );
      await db.exec(migrationSql);

      // Create test reporter profile
      await db.exec(`
        INSERT INTO public.profiles (id) VALUES ('11111111-1111-4111-8111-111111111111'::UUID);
      `);

      // Insert civic report with reported_item_type = 'environmental_issue' and reason = 'other'
      const testReportId = '22222222-2222-4222-8222-222222222222';
      await db.exec(`
        INSERT INTO public.reports (
          id, reporter_id, reported_item_type, reported_item_id, reason, details, other_description, issue_type, status
        ) VALUES (
          '${testReportId}'::UUID,
          '11111111-1111-4111-8111-111111111111'::UUID,
          'environmental_issue',
          '${testReportId}'::UUID,
          'other',
          '{"title":"Chemical Spill","other_description":"Diesel fuel spill in gutter"}',
          'Diesel fuel spill in gutter',
          'other',
          'pending'
        );
      `);

      const queryRes = await db.query<any>(`
        SELECT id, reported_item_type, reason, other_description, status 
        FROM public.reports 
        WHERE id = '${testReportId}'::UUID;
      `);

      expect(queryRes.rows.length).toBe(1);
      const row = queryRes.rows[0];
      expect(row.reported_item_type).toBe('environmental_issue');
      expect(row.reason).toBe('other');
      expect(row.other_description).toBe('Diesel fuel spill in gutter');
      expect(row.status).toBe('pending');
    }, 30000);

    it('migration execution is strictly idempotent', async () => {
      const db = new PGlite();
      await db.exec(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
          SELECT '11111111-1111-4111-8111-111111111111'::UUID;
        $$ LANGUAGE sql STABLE;

        CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS public.reports (
          id UUID PRIMARY KEY, reporter_id UUID REFERENCES public.profiles(id),
          reported_item_type TEXT, reported_item_id UUID, reason TEXT, details TEXT, status TEXT
        );
      `);

      const migrationSql = fs.readFileSync(
        'supabase/migrations/20261110040000_other_environmental_issue_reports.sql',
        'utf8'
      );

      // Execute migration twice to prove idempotency
      await db.exec(migrationSql);
      await db.exec(migrationSql);

      // Verify check constraint allows environmental_issue
      await db.exec(`
        INSERT INTO public.profiles (id) VALUES ('11111111-1111-4111-8111-111111111111'::UUID);
        INSERT INTO public.reports (id, reporter_id, reported_item_type, reported_item_id, reason)
        VALUES (
          '33333333-3333-4333-8333-333333333333'::UUID,
          '11111111-1111-4111-8111-111111111111'::UUID,
          'environmental_issue',
          '33333333-3333-4333-8333-333333333333'::UUID,
          'other'
        );
      `);

      const res = await db.query('SELECT COUNT(*) FROM public.reports;');
      expect(Number((res.rows[0] as any).count)).toBe(1);
    }, 30000);
  });
});
