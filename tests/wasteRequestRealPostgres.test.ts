import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// GREENLOOP WASTE REQUEST WORKFLOW — PGLITE POSTGRESQL TEST SUITE
// Environment: PGlite in-process PostgreSQL Engine (WASM)
// Validates: Sequential application of all 4 migrations (000000 -> 030000),
//            provider derivation, RLS isolation, completion code shielding,
//            and atomic handover verification with point allocations.
// ==============================================================================

describe('Real PostgreSQL Migration & Security Integration Tests', () => {
  let db: PGlite;

  const ACCOUNT_A_PROVIDER = '11111111-1111-4000-8000-000000000001';
  const ACCOUNT_B_REQUESTER = '22222222-2222-4000-8000-000000000002';
  const ACCOUNT_C_INTRUDER = '33333333-3333-4000-8000-000000000003';

  const LISTING_ID_1 = 'aaaaaaaa-aaaa-4000-8000-000000000001';
  const CATEGORY_ID_1 = 'cccccccc-cccc-4000-8000-000000000001';

  // Helper to switch session role and auth context
  async function asUser(userId: string | null, role: 'authenticated' | 'anon' = 'authenticated') {
    await db.query(`SET ROLE ${role};`);
    await db.query(`SELECT set_config('request.jwt.claim.role', $1, false);`, [role]);
    if (userId) {
      await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [userId]);
    } else {
      await db.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }
  }

  async function asSuperuser() {
    await db.query(`RESET ROLE;`);
    await db.query(`SELECT set_config('request.jwt.claim.role', '', false);`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
  }

  async function applyAllMigrations() {
    const mig0 = path.resolve(__dirname, '../supabase/migrations/20261109000000_exchange_requests_and_notifications.sql');
    const mig1 = path.resolve(__dirname, '../supabase/migrations/20261109010000_private_chat_and_contact_sharing.sql');
    const mig2 = path.resolve(__dirname, '../supabase/migrations/20261109020000_chat_security_and_idempotency_hardening.sql');
    const mig3 = path.resolve(__dirname, '../supabase/migrations/20261109030000_production_chat_and_notification_hardening.sql');

    await db.exec(fs.readFileSync(mig0, 'utf8'));
    await db.exec(fs.readFileSync(mig1, 'utf8'));
    await db.exec(fs.readFileSync(mig2, 'utf8'));
    await db.exec(fs.readFileSync(mig3, 'utf8'));
  }

  beforeEach(async () => {
    // 1. Boot fresh real PostgreSQL instance
    db = new PGlite();

    // 2. Set up base Supabase schema & roles
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS public;

      -- Supabase mock auth.uid() function
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      BEGIN
        RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
      BEGIN
        RETURN COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user);
      EXCEPTION WHEN OTHERS THEN
        RETURN current_user;
      END;
      $$ LANGUAGE plpgsql STABLE;

      -- Roles
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;

      -- Base Tables
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT
      );

      CREATE TABLE public.waste_categories (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        default_co2_factor NUMERIC NOT NULL DEFAULT 1.8,
        default_landfill_factor NUMERIC NOT NULL DEFAULT 1.1
      );

      CREATE TABLE public.listings (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES public.waste_categories(id),
        title TEXT NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 10,
        unit TEXT NOT NULL DEFAULT 'kg',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Legacy exchange_requests table (before migration adds provider_id)
      CREATE TABLE public.exchange_requests (
        id UUID PRIMARY KEY,
        listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
        requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        requested_quantity NUMERIC NOT NULL,
        proposed_action TEXT,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        completion_code TEXT NOT NULL,
        pickup_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE public.transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id UUID NOT NULL REFERENCES public.listings(id),
        exchange_request_id UUID UNIQUE NOT NULL REFERENCES public.exchange_requests(id),
        generator_id UUID NOT NULL REFERENCES public.profiles(id),
        recipient_id UUID NOT NULL REFERENCES public.profiles(id),
        category_id UUID NOT NULL REFERENCES public.waste_categories(id),
        quantity NUMERIC(10, 2) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        co2_saved_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        landfill_saved_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        eco_points_awarded INTEGER NOT NULL DEFAULT 50,
        verified_by_recipient BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE public.eco_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        reference_id UUID,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed Profiles & Initial Data
      INSERT INTO public.profiles (id, full_name, email) VALUES
        ('${ACCOUNT_A_PROVIDER}', 'Anoop Provider', 'anoop@greenloop.in'),
        ('${ACCOUNT_B_REQUESTER}', 'Bina Requester', 'bina@greenloop.in'),
        ('${ACCOUNT_C_INTRUDER}', 'Charlie Intruder', 'charlie@greenloop.in');

      INSERT INTO public.waste_categories (id, name, slug) VALUES
        ('${CATEGORY_ID_1}', 'Plastics', 'plastics');

      INSERT INTO public.listings (id, user_id, category_id, title, quantity, unit, status) VALUES
        ('${LISTING_ID_1}', '${ACCOUNT_A_PROVIDER}', '${CATEGORY_ID_1}', '50 Clean HDPE Drums', 50, 'kg', 'active');

      -- Base grants for roles
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    `);

    // 3. Seed an existing legacy exchange request to test safe backfilling & orphaned requests
    await db.exec(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, status, completion_code)
      VALUES 
        ('bbbbbbbb-0001-4000-8000-000000000001', '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 10, 'pending', 'GL-1001'),
        ('bbbbbbbb-0002-4000-8000-000000000002', NULL, '${ACCOUNT_B_REQUESTER}', 5, 'pending', 'GL-1002');
    `);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('Requirement 3 & 9: Migration executes cleanly and idempotently on real PostgreSQL', async () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261109000000_exchange_requests_and_notifications.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Run 1: Apply migration
    await db.exec(migrationSql);

    // Verify provider_id column added
    const colCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'exchange_requests' AND column_name = 'provider_id';
    `);
    expect(colCheck.rows.length).toBe(1);

    // Verify backfill: request 1 has provider_id backfilled, request 2 (orphaned) preserved with NULL
    const rows = await db.query(`SELECT id, provider_id FROM public.exchange_requests ORDER BY id ASC;`);
    expect(rows.rows[0].provider_id).toBe(ACCOUNT_A_PROVIDER);
    expect(rows.rows[1].provider_id).toBeNull(); // Safely preserved orphaned request!

    // Run 2: Verify Idempotence (should succeed without errors)
    await expect(db.exec(migrationSql)).resolves.toBeDefined();
  });

  it('Requirement 1, 4 & 5: Creating a request automatically derives provider_id and triggers transactional notification', async () => {
    await applyAllMigrations();

    // Switch to Account B (Requester)
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const newReqId = 'bbbbbbbb-0003-4000-8000-000000000003';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, completion_code
      ) VALUES (
        $1, $2, $3, 15, 'GL-5555'
      );
    `, [newReqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    // Inspect inserted row
    await asSuperuser();
    const reqRes = await db.query(`SELECT * FROM public.exchange_requests WHERE id = $1;`, [newReqId]);
    expect(reqRes.rows[0].provider_id).toBe(ACCOUNT_A_PROVIDER);
    expect(reqRes.rows[0].status).toBe('pending');

    // Verify Notification: Exactly ONE notification created for Account A (Provider)
    const notifRes = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1;`, [ACCOUNT_A_PROVIDER]);
    expect(notifRes.rows.length).toBe(1);
    expect(notifRes.rows[0].title).toBe('New Exchange Request');
    expect(notifRes.rows[0].message).toContain('Bina Requester requested 15 units of "50 Clean HDPE Drums"');
  });

  it('Requirement 2: Reject request if creator attempts to request their own listing', async () => {
    await applyAllMigrations();

    // Switch to Account A (Provider attempting to request their own waste)
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');

    await expect(
      db.query(`
        INSERT INTO public.exchange_requests (
          id, listing_id, requester_id, requested_quantity, completion_code
        ) VALUES (
          'bbbbbbbb-0004-4000-8000-000000000004', '${LISTING_ID_1}', '${ACCOUNT_A_PROVIDER}', 5, 'GL-9999'
        );
      `)
    ).rejects.toThrow(/Waste creators cannot submit exchange requests on their own listings/);
  });

  it('Requirement 2 & 10: RLS enforces privacy: Account C (Intruder) cannot view or update requests or notifications', async () => {
    await applyAllMigrations();

    // Switch to Account C (Intruder)
    await asUser(ACCOUNT_C_INTRUDER, 'authenticated');

    // Query exchange_requests: Account C sees 0 rows
    const cRequests = await db.query(`SELECT * FROM public.exchange_requests;`);
    expect(cRequests.rows.length).toBe(0);

    // Query notifications: Account C sees 0 rows
    const cNotifs = await db.query(`SELECT * FROM public.notifications;`);
    expect(cNotifs.rows.length).toBe(0);

    // Attempt to accept/tamper request bbbbbbbb-0001-4000-8000-000000000001: RLS filters it out (0 rows affected)
    const updateRes = await db.query(`
      UPDATE public.exchange_requests
      SET status = 'accepted'
      WHERE id = 'bbbbbbbb-0001-4000-8000-000000000001';
    `);
    expect(updateRes.rowCount).toBe(0);
  });

  it('Requirement 7: Provider accepts request -> updates status and notifies requester without completion code disclosure', async () => {
    await applyAllMigrations();

    const reqId = 'bbbbbbbb-0001-4000-8000-000000000001';

    // Account A (Provider) accepts request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`
      UPDATE public.exchange_requests
      SET status = 'accepted'
      WHERE id = $1;
    `, [reqId]);

    await asSuperuser();

    // Verify request is accepted
    const reqRes = await db.query(`SELECT status, pickup_date FROM public.exchange_requests WHERE id = $1;`, [reqId]);
    expect(reqRes.rows[0].status).toBe('accepted');
    expect(reqRes.rows[0].pickup_date).not.toBeNull();

    // Verify listing status atomically updated to pending via trigger
    const listingRes = await db.query(`SELECT status FROM public.listings WHERE id = $1;`, [LISTING_ID_1]);
    expect(listingRes.rows[0].status).toBe('pending');

    // Verify notification sent to Account B (Requester) WITHOUT completion code
    const notifRes = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1;`, [ACCOUNT_B_REQUESTER]);
    expect(notifRes.rows.length).toBe(1);
    expect(notifRes.rows[0].title).toBe('Request Accepted');
    // Security verification: Handover pass code GL-1001 must not leak in notifications
    expect(notifRes.rows[0].message).not.toContain('GL-1001');
    expect(notifRes.rows[0].message).toContain('accepted by the provider');
    expect(notifRes.rows[0].message).toContain('Coordinate pickup details in chat and present your pass code at pickup');
  });

  it('Requirement 2: Non-provider cannot accept request', async () => {
    await applyAllMigrations();

    const reqId = 'bbbbbbbb-0001-4000-8000-000000000001';

    // Account B (Requester) tries to accept their own request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = $1;`, [reqId])
    ).rejects.toThrow(/Only the waste provider can accept this request/);
  });

  it('Requirement 2: Core fields immutability prevents tampering', async () => {
    await applyAllMigrations();

    const reqId = 'bbbbbbbb-0001-4000-8000-000000000001';

    // Account A (Provider) tries to change the requested quantity or completion code
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await expect(
      db.query(`UPDATE public.exchange_requests SET requested_quantity = 99 WHERE id = $1;`, [reqId])
    ).rejects.toThrow(/Requested quantity is immutable/);

    await expect(
      db.query(`UPDATE public.exchange_requests SET completion_code = 'GL-HACK' WHERE id = $1;`, [reqId])
    ).rejects.toThrow(/Handover verification code is immutable/);
  });

  it('Requirement 8 & 10: Notification immutability protects payloads and allows updating only is_read', async () => {
    await applyAllMigrations();

    // Provider A triggers a notification by accepting the request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = 'bbbbbbbb-0001-4000-8000-000000000001';`);

    await asSuperuser();
    const notifRow = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1;`, [ACCOUNT_B_REQUESTER]);
    const notifId = notifRow.rows[0].id;

    // Switch to Account B (owner of notification)
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    // Attempting to modify title/message fails
    await expect(
      db.query(`UPDATE public.notifications SET title = 'Fake Title' WHERE id = $1;`, [notifId])
    ).rejects.toThrow(/Only the read status \(is_read\) of a notification can be updated/);

    // Updating is_read = true succeeds
    await expect(
      db.query(`UPDATE public.notifications SET is_read = TRUE WHERE id = $1;`, [notifId])
    ).resolves.toBeDefined();

    const check = await db.query(`SELECT is_read FROM public.notifications WHERE id = $1;`, [notifId]);
    expect(check.rows[0].is_read).toBe(true);
  });

  it('Requirement 6: confirm_exchange_handover atomically completes exchange, generates transaction, credits points, and notifies both parties', async () => {
    await applyAllMigrations();

    const reqId = 'bbbbbbbb-0001-4000-8000-000000000001';

    // First transition to accepted
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = $1;`, [reqId]);

    // Test invalid completion code
    await expect(
      db.query(`SELECT public.confirm_exchange_handover($1, 'GL-WRONG');`, [reqId])
    ).rejects.toThrow(/Invalid pickup verification code/);

    // Call with valid completion code (GL-1001)
    const result = await db.query(`SELECT public.confirm_exchange_handover($1, 'GL-1001') as res;`, [reqId]);
    const resData = result.rows[0].res;
    expect(resData.success).toBe(true);
    expect(resData.points_generator).toBe(50);
    expect(resData.points_recipient).toBe(30);

    await asSuperuser();

    // 1. Verify exchange_request status is completed
    const reqRow = await db.query(`SELECT status FROM public.exchange_requests WHERE id = $1;`, [reqId]);
    expect(reqRow.rows[0].status).toBe('completed');

    // 2. Verify listing status is completed
    const listRow = await db.query(`SELECT status FROM public.listings WHERE id = $1;`, [LISTING_ID_1]);
    expect(listRow.rows[0].status).toBe('completed');

    // 3. Verify transaction record exists
    const txRow = await db.query(`SELECT * FROM public.transactions WHERE exchange_request_id = $1;`, [reqId]);
    expect(txRow.rows.length).toBe(1);
    expect(Number(txRow.rows[0].quantity)).toBe(10);
    expect(txRow.rows[0].generator_id).toBe(ACCOUNT_A_PROVIDER);
    expect(txRow.rows[0].recipient_id).toBe(ACCOUNT_B_REQUESTER);

    // 4. Verify EcoPoints ledger has entries for both provider (+50) and requester (+30)
    const ptsRows = await db.query(`SELECT * FROM public.eco_points WHERE reference_id = $1 ORDER BY points DESC;`, [txRow.rows[0].id]);
    expect(ptsRows.rows.length).toBe(2);
    expect(ptsRows.rows[0].user_id).toBe(ACCOUNT_A_PROVIDER);
    expect(ptsRows.rows[0].points).toBe(50);
    expect(ptsRows.rows[1].user_id).toBe(ACCOUNT_B_REQUESTER);
    expect(ptsRows.rows[1].points).toBe(30);

    // 5. Verify completion notifications delivered to both Account A and Account B
    const notifs = await db.query(`SELECT * FROM public.notifications WHERE type = 'points' ORDER BY user_id ASC;`);
    expect(notifs.rows.length).toBe(2);
    expect(notifs.rows.some((n: any) => n.user_id === ACCOUNT_A_PROVIDER && (n.title === 'Exchange Completed' || n.title === 'Material Received'))).toBe(true);
    expect(notifs.rows.some((n: any) => n.user_id === ACCOUNT_B_REQUESTER && (n.title === 'Exchange Completed' || n.title === 'Material Received'))).toBe(true);
  });

  it('Requirement 11: Anonymous access is strictly rejected across protected tables and actions', async () => {
    await applyAllMigrations();

    // Switch to anonymous user
    await asUser(null, 'anon');

    // SELECT on exchange_requests is rejected by table privileges (permission denied)
    await expect(
      db.query(`SELECT * FROM public.exchange_requests;`)
    ).rejects.toThrow(/permission denied/i);

    // SELECT on notifications is rejected by table privileges (permission denied)
    await expect(
      db.query(`SELECT * FROM public.notifications;`)
    ).rejects.toThrow(/permission denied/i);

    // INSERT into exchange_requests is rejected by table privileges
    await expect(
      db.query(`
        INSERT INTO public.exchange_requests (
          id, listing_id, requester_id, requested_quantity, completion_code
        ) VALUES (
          'bbbbbbbb-0005-4000-8000-000000000005', '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 5, 'GL-0000'
        );
      `)
    ).rejects.toThrow(/permission denied/i);

    // INSERT into notifications is rejected by table privileges
    await expect(
      db.query(`
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES ('${ACCOUNT_A_PROVIDER}', 'Spam', 'Spam', 'request');
      `)
    ).rejects.toThrow(/permission denied/i);
  });
});
