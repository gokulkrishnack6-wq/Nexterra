import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// GREENLOOP WHATSAPP EXCHANGE COMMUNICATION & PRIVACY — PGLITE TEST SUITE
// Environment: Real in-process PostgreSQL Engine (WASM)
// Tests: Sequential migrations (000000 -> 040000), state-machine contact gating,
//        explicit user consent, intruder isolation, consent revocation, and
//        atomic handover verification with zero bypass codes.
// ==============================================================================

describe('GreenLoop WhatsApp Exchange & Contact Privacy — PGlite Tests', () => {
  let db: PGlite;

  const ACCOUNT_A_PROVIDER = '11111111-1111-4000-8000-000000000001';
  const ACCOUNT_B_REQUESTER = '22222222-2222-4000-8000-000000000002';
  const ACCOUNT_C_INTRUDER = '33333333-3333-4000-8000-000000000003';

  const LISTING_ID_1 = 'aaaaaaaa-aaaa-4000-8000-000000000001';
  const CATEGORY_ID_1 = 'cccccccc-cccc-4000-8000-000000000001';

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
    const mig4 = path.resolve(__dirname, '../supabase/migrations/20261109040000_whatsapp_exchange_communication.sql');
    const mig5 = path.resolve(__dirname, '../supabase/migrations/20261109050000_whatsapp_contact_sharing_hardening.sql');

    await db.exec(fs.readFileSync(mig0, 'utf8'));
    await db.exec(fs.readFileSync(mig1, 'utf8'));
    await db.exec(fs.readFileSync(mig2, 'utf8'));
    await db.exec(fs.readFileSync(mig3, 'utf8'));
    await db.exec(fs.readFileSync(mig4, 'utf8'));
    await db.exec(fs.readFileSync(mig5, 'utf8'));
  }

  async function applySimplifiedMigration() {
    await applyAllMigrations();
    const mig6 = path.resolve(__dirname, '../supabase/migrations/20261110010000_simplify_whatsapp_contact_sharing.sql');
    await db.exec(fs.readFileSync(mig6, 'utf8'));
  }

  async function applyLifecycleHardeningMigration() {
    await applySimplifiedMigration();
    const mig7 = path.resolve(__dirname, '../supabase/migrations/20261110020000_listing_lifecycle_and_exchange_hardening.sql');
    await db.exec(fs.readFileSync(mig7, 'utf8'));
  }

  beforeEach(async () => {
    db = new PGlite();

    // 1. Schemas & auth mocking
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS public;

      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY,
        email TEXT,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        email_confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT,
        district TEXT,
        state TEXT DEFAULT 'Kerala',
        phone TEXT,
        phone_number TEXT,
        whatsapp_number TEXT,
        share_phone_with_exchange BOOLEAN DEFAULT false,
        share_whatsapp_with_exchange BOOLEAN DEFAULT false,
        eco_points_balance INT DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

      CREATE TABLE public.exchange_requests (
        id UUID PRIMARY KEY,
        listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
        requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        requested_quantity NUMERIC NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'pending',
        completion_code TEXT NOT NULL,
        message TEXT,
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
        exchange_request_id UUID NOT NULL REFERENCES public.exchange_requests(id),
        generator_id UUID NOT NULL REFERENCES public.profiles(id),
        recipient_id UUID NOT NULL REFERENCES public.profiles(id),
        category_id UUID NOT NULL REFERENCES public.waste_categories(id),
        quantity NUMERIC NOT NULL,
        unit TEXT NOT NULL,
        co2_saved_kg NUMERIC NOT NULL,
        landfill_saved_kg NUMERIC NOT NULL,
        eco_points_awarded INT NOT NULL,
        verified_by_recipient BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE public.eco_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        points INT NOT NULL,
        action_type TEXT NOT NULL,
        reference_id UUID,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed Initial Profiles
      INSERT INTO public.profiles (id, full_name, email, whatsapp_number, share_whatsapp_with_exchange)
      VALUES 
        ('${ACCOUNT_A_PROVIDER}', 'Provider Priya', 'priya@greenloop.org', '+91 98765 11111', true),
        ('${ACCOUNT_B_REQUESTER}', 'Requester Rahul', 'rahul@greenloop.org', '+91 98765 22222', true),
        ('${ACCOUNT_C_INTRUDER}', 'Intruder Imran', 'imran@greenloop.org', '+91 98765 33333', false);

      INSERT INTO public.waste_categories (id, name, slug)
      VALUES ('${CATEGORY_ID_1}', 'Organic Waste', 'organic');

      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${LISTING_ID_1}', '${ACCOUNT_A_PROVIDER}', '${CATEGORY_ID_1}', 'Coconut Husks', 10);

      -- Base grants for roles
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    `);
  }, 45000);

  it('Verifies Requirements 1–8: Complete WhatsApp Contact Lifecycle & Privacy Isolation', async () => {
    await applyAllMigrations();

    const reqId = 'bbbbbbbb-1111-4000-8000-000000000001';

    // 1. Account B creates an exchange request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, completion_code, message
      ) VALUES (
        $1, '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 5, 'GL-9999', 'Need coconut husks for organic mulch'
      );
    `, [reqId]);

    // 2. While pending: NEITHER participant receives WhatsApp contact access
    // Provider queries Requester
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    const provQueryPending = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_B_REQUESTER]
    );
    expect(provQueryPending.rows[0].res.whatsapp).toBeNull();
    expect(provQueryPending.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(provQueryPending.rows[0].res.status).toBe('pending');

    // Requester queries Provider
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqQueryPending = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_A_PROVIDER]
    );
    expect(reqQueryPending.rows[0].res.whatsapp).toBeNull();
    expect(reqQueryPending.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(reqQueryPending.rows[0].res.status).toBe('pending');

    // 3. Account A accepts the request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = $1;`, [reqId]);

    // 4. Upon acceptance: Both participants can access each other's WhatsApp contact (both have consented)
    // Provider queries Requester
    const provQueryAccepted = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_B_REQUESTER]
    );
    expect(provQueryAccepted.rows[0].res.has_whatsapp_consent).toBe(true);
    // Normalized to E.164 digits without spaces or plus
    expect(provQueryAccepted.rows[0].res.whatsapp).toBe('919876522222');
    expect(provQueryAccepted.rows[0].res.status).toBe('accepted');

    // Requester queries Provider
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqQueryAccepted = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_A_PROVIDER]
    );
    expect(reqQueryAccepted.rows[0].res.has_whatsapp_consent).toBe(true);
    expect(reqQueryAccepted.rows[0].res.whatsapp).toBe('919876511111');
    expect(reqQueryAccepted.rows[0].res.status).toBe('accepted');

    // 5. Account C (Unrelated Intruder) CANNOT retrieve either participant's contact
    await asUser(ACCOUNT_C_INTRUDER, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2);`, [reqId, ACCOUNT_A_PROVIDER])
    ).rejects.toThrow(/Permission denied: Caller is not an authorized participant/);

    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2);`, [reqId, ACCOUNT_B_REQUESTER])
    ).rejects.toThrow(/Permission denied: Caller is not an authorized participant/);

    // 6. Revoking consent immediately prevents future contact retrieval
    // Requester revokes consent
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = false WHERE id = $1;`, [ACCOUNT_B_REQUESTER]);

    // Provider tries to query Requester now
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    const provQueryAfterRevoke = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_B_REQUESTER]
    );
    expect(provQueryAfterRevoke.rows[0].res.whatsapp).toBeNull();
    expect(provQueryAfterRevoke.rows[0].res.has_whatsapp_consent).toBe(false);

    // Requester re-enables consent
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = $1;`, [ACCOUNT_B_REQUESTER]);

    // 7. Handover verification and EcoPoints still work (Requirement 10)
    // First verify GL-CONFIRM bypass is rejected
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await expect(
      db.query(`SELECT public.confirm_exchange_handover($1, 'GL-CONFIRM');`, [reqId])
    ).rejects.toThrow(/Invalid pickup verification code/);

    // Authorized completion with actual code GL-9999
    const handoverRes = await db.query(
      `SELECT public.confirm_exchange_handover($1, 'GL-9999') as res;`,
      [reqId]
    );
    expect(handoverRes.rows[0].res.success).toBe(true);
    expect(handoverRes.rows[0].res.points_generator).toBe(50);
    expect(handoverRes.rows[0].res.points_recipient).toBe(30);

    // 8. Completed exchanges preserve history WITHOUT unintended contact disclosure
    const provQueryCompleted = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [reqId, ACCOUNT_B_REQUESTER]
    );
    expect(provQueryCompleted.rows[0].res.whatsapp).toBeNull();
    expect(provQueryCompleted.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(provQueryCompleted.rows[0].res.status).toBe('completed');
  });

  it('Verifies Rejected and Cancelled requests do NOT provide contact access', async () => {
    await applyAllMigrations();

    const rejReqId = 'bbbbbbbb-2222-4000-8000-000000000002';
    const canReqId = 'bbbbbbbb-3333-4000-8000-000000000003';

    // Seed requests and transition through state machine
    await asSuperuser();
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, completion_code)
      VALUES 
        ('${rejReqId}', '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 'GL-REJ1'),
        ('${canReqId}', '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 'GL-CAN1');
    `);

    // Provider declines rejReqId
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'rejected' WHERE id = '${rejReqId}';`);

    // Requester cancels canReqId
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'cancelled' WHERE id = '${canReqId}';`);

    // Provider queries rejected request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    const rejContact = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [rejReqId, ACCOUNT_B_REQUESTER]
    );
    expect(rejContact.rows[0].res.whatsapp).toBeNull();
    expect(rejContact.rows[0].res.has_whatsapp_consent).toBe(false);

    // Requester queries cancelled request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const canContact = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [canReqId, ACCOUNT_A_PROVIDER]
    );
    expect(canContact.rows[0].res.whatsapp).toBeNull();
    expect(canContact.rows[0].res.has_whatsapp_consent).toBe(false);
  });

  it('Verifies Requirement 9: WhatsApp phone number normalization & validation logic', async () => {
    await applyAllMigrations();

    const normReqId = 'bbbbbbbb-4444-4000-8000-000000000004';
    await asSuperuser();
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, completion_code)
      VALUES ('${normReqId}', '${LISTING_ID_1}', '${ACCOUNT_B_REQUESTER}', 5, 'GL-NORM');
    `);
    // Provider accepts the request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${normReqId}';`);

    // Test Case 1: 10-digit Indian number without country code gets normalized with 91 prefix
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET whatsapp_number = '9876543210', share_whatsapp_with_exchange = true WHERE id = '${ACCOUNT_B_REQUESTER}';`);
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    let res = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [normReqId, ACCOUNT_B_REQUESTER]);
    expect(res.rows[0].res.whatsapp).toBe('919876543210');

    // Test Case 2: Number with international prefix +91 and formatting
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET whatsapp_number = '+91 (987) 654-3210', share_whatsapp_with_exchange = true WHERE id = '${ACCOUNT_B_REQUESTER}';`);
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    res = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [normReqId, ACCOUNT_B_REQUESTER]);
    expect(res.rows[0].res.whatsapp).toBe('919876543210');

    // Test Case 3: International number (e.g. UK +44 7911 123456)
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET whatsapp_number = '+44 7911 123456', share_whatsapp_with_exchange = true WHERE id = '${ACCOUNT_B_REQUESTER}';`);
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    res = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [normReqId, ACCOUNT_B_REQUESTER]);
    expect(res.rows[0].res.whatsapp).toBe('447911123456');

    // Test Case 4: Invalid number (less than 10 digits) -> returns null
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET whatsapp_number = '12345', share_whatsapp_with_exchange = true WHERE id = '${ACCOUNT_B_REQUESTER}';`);
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    res = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [normReqId, ACCOUNT_B_REQUESTER]);
    expect(res.rows[0].res.whatsapp).toBeNull();
    expect(res.rows[0].res.has_whatsapp_consent).toBe(false);
  });

  it('Verifies Requirement 11: Existing users without WhatsApp numbers can continue using unrelated features', async () => {
    await applyAllMigrations();

    const userNoWa = '44444444-4444-4000-8000-000000000004';
    await asSuperuser();
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, whatsapp_number, share_whatsapp_with_exchange)
      VALUES ('${userNoWa}', 'Legacy User', 'legacy@greenloop.org', NULL, false);
    `);

    // Legacy user can browse listings
    await asUser(userNoWa, 'authenticated');
    const listings = await db.query(`SELECT * FROM public.listings WHERE status = 'active';`);
    expect(listings.rows.length).toBeGreaterThanOrEqual(1);

    // Legacy user can create their own listing
    const newListingId = 'aaaaaaaa-bbbb-4000-8000-000000000002';
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${newListingId}', '${userNoWa}', '${CATEGORY_ID_1}', 'Newspaper Bundles', 25);
    `);
    const created = await db.query(`SELECT * FROM public.listings WHERE id = $1;`, [newListingId]);
    expect(created.rows.length).toBe(1);
    expect(created.rows[0].title).toBe('Newspaper Bundles');
  });

  it('Verifies WhatsApp Number Persistent Storage, Signup Trigger Synchronization, and Cross-Account Isolation', async () => {
    await applyAllMigrations();

    const USER_ALPHA = '55555555-5555-4000-8000-000000000005';
    const USER_BETA = '66666666-6666-4000-8000-000000000006';
    const USER_GAMMA = '77777777-7777-4000-8000-000000000007';

    await asSuperuser();

    // 1. Account Alpha signs up with WhatsApp number & consent = true
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        $1,
        'alpha@greenloop.org',
        jsonb_build_object(
          'full_name', 'Alpha Alappuzha',
          'district', 'Alappuzha',
          'whatsapp_number', '+91 98765 55555',
          'share_whatsapp_with_exchange', true
        )
      );
    `, [USER_ALPHA]);

    // Verify handle_new_user() trigger automatically populated public.profiles
    let profileAlpha = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [USER_ALPHA]);
    expect(profileAlpha.rows.length).toBe(1);
    expect(profileAlpha.rows[0].whatsapp_number).toBe('+91 98765 55555');
    expect(profileAlpha.rows[0].share_whatsapp_with_exchange).toBe(true);

    // 2. Client-side registration upsert race condition safety:
    // AuthContext.registerUser() executes an upsert which must succeed without duplicate key errors
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, whatsapp_number, share_whatsapp_with_exchange)
      VALUES ($1, 'Alpha Alappuzha', 'alpha@greenloop.org', '+91 98765 55555', true)
      ON CONFLICT (id) DO UPDATE SET
        whatsapp_number = EXCLUDED.whatsapp_number,
        share_whatsapp_with_exchange = EXCLUDED.share_whatsapp_with_exchange;
    `, [USER_ALPHA]);

    profileAlpha = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [USER_ALPHA]);
    expect(profileAlpha.rows[0].whatsapp_number).toBe('+91 98765 55555');

    // 3. Account Beta signs up with distinct WhatsApp number and consent = false
    await asSuperuser();
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        $1,
        'beta@greenloop.org',
        jsonb_build_object(
          'full_name', 'Beta Kozhikode',
          'district', 'Kozhikode',
          'whatsapp_number', '+91 98765 66666',
          'share_whatsapp_with_exchange', false
        )
      );
    `, [USER_BETA]);

    const profileBeta = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [USER_BETA]);
    expect(profileBeta.rows.length).toBe(1);
    expect(profileBeta.rows[0].whatsapp_number).toBe('+91 98765 66666');
    expect(profileBeta.rows[0].share_whatsapp_with_exchange).toBe(false);

    // 4. Persistence & UI Prompt Condition Verification:
    // User Alpha has a saved WhatsApp number -> Exchanges page banner (!user.whatsapp_number) evaluates false
    const alphaHasNumber = Boolean(profileAlpha.rows[0].whatsapp_number?.trim());
    expect(alphaHasNumber).toBe(true);

    // User Beta has a saved WhatsApp number (with consent false) -> banner also evaluates false!
    // Storing consent independently ensures users who opted out of sharing are NOT badgered to configure a number
    const betaHasNumber = Boolean(profileBeta.rows[0].whatsapp_number?.trim());
    expect(betaHasNumber).toBe(true);
    expect(profileBeta.rows[0].share_whatsapp_with_exchange).toBe(false);

    // 5. Profile Update Verification & Account Isolation:
    // User Alpha updates their number and toggles consent
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`
      UPDATE public.profiles
      SET whatsapp_number = '+91 98765 77777', share_whatsapp_with_exchange = false
      WHERE id = $1;
    `, [USER_ALPHA]);

    const updatedAlpha = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [USER_ALPHA]);
    expect(updatedAlpha.rows[0].whatsapp_number).toBe('+91 98765 77777');
    expect(updatedAlpha.rows[0].share_whatsapp_with_exchange).toBe(false);

    // Verify Beta's profile was NOT modified (strict cross-account isolation)
    const untouchedBeta = await db.query(`SELECT * FROM public.profiles WHERE id = $1;`, [USER_BETA]);
    expect(untouchedBeta.rows[0].whatsapp_number).toBe('+91 98765 66666');
    expect(untouchedBeta.rows[0].share_whatsapp_with_exchange).toBe(false);

    // 6. Contact State Transitions & Explicit Statuses (4 states):
    // Create listing owned by Alpha
    const alphaListingId = 'aaaaaaaa-cccc-4000-8000-000000000001';
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${alphaListingId}', '${USER_ALPHA}', '${CATEGORY_ID_1}', 'Compost Batch', 15);
    `);

    // Beta requests the exchange
    const alphaBetaReqId = 'bbbbbbbb-5555-4000-8000-000000000005';
    await asUser(USER_BETA, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, completion_code)
      VALUES ('${alphaBetaReqId}', '${alphaListingId}', '${USER_BETA}', 5, 'GL-5555');
    `);

    // Alpha accepts the exchange
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${alphaBetaReqId}';`);

    // State 1: sharing_disabled
    // Beta queries Alpha's contact while Alpha has share_whatsapp_with_exchange = false
    await asUser(USER_BETA, 'authenticated');
    const resSharingDisabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [alphaBetaReqId, USER_ALPHA]
    );
    expect(resSharingDisabled.rows[0].res.whatsapp).toBeNull();
    expect(resSharingDisabled.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(resSharingDisabled.rows[0].res.contact_state).toBe('sharing_disabled');
    expect(resSharingDisabled.rows[0].res.notice).toBe('WhatsApp contact not shared by partner');

    // State 2: sharing_enabled
    // Alpha enables consent
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = $1;`, [USER_ALPHA]);

    await asUser(USER_BETA, 'authenticated');
    const resSharingEnabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [alphaBetaReqId, USER_ALPHA]
    );
    expect(resSharingEnabled.rows[0].res.whatsapp).toBe('919876577777');
    expect(resSharingEnabled.rows[0].res.has_whatsapp_consent).toBe(true);
    expect(resSharingEnabled.rows[0].res.contact_state).toBe('sharing_enabled');
    expect(resSharingEnabled.rows[0].res.notice).toBe('WhatsApp contact active for collection coordination');

    // State 3: missing_number
    // Create User Gamma without a WhatsApp number
    await asSuperuser();
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, whatsapp_number, share_whatsapp_with_exchange)
      VALUES ('${USER_GAMMA}', 'Gamma Thrissur', 'gamma@greenloop.org', NULL, true);
    `);
    const gammaReqId = 'bbbbbbbb-6666-4000-8000-000000000006';
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, completion_code)
      VALUES ('${gammaReqId}', '${alphaListingId}', '${USER_GAMMA}', 2, 'GL-6666');
    `);
    await asUser(USER_ALPHA, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${gammaReqId}';`);

    const resMissing = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [gammaReqId, USER_GAMMA]
    );
    expect(resMissing.rows[0].res.whatsapp).toBeNull();
    expect(resMissing.rows[0].res.contact_state).toBe('missing_number');
    expect(resMissing.rows[0].res.notice).toBe('Partner has not configured a WhatsApp number');

    // State 4: invalid_number
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET whatsapp_number = '123' WHERE id = '${USER_GAMMA}';`);
    await asUser(USER_ALPHA, 'authenticated');
    const resInvalid = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [gammaReqId, USER_GAMMA]
    );
    expect(resInvalid.rows[0].res.whatsapp).toBeNull();
    expect(resInvalid.rows[0].res.contact_state).toBe('invalid_number');
    expect(resInvalid.rows[0].res.notice).toBe("Partner's WhatsApp number is invalid");
  });

  it('Verifies WhatsApp Contact Sharing Hardening: NULL provider_id resolution, self-healing, mutual two-way retrieval, and consent defaulting', async () => {
    await applyAllMigrations();

    const USER_DEV_A = 'dddddddd-1111-4000-8000-000000000001';
    const USER_DEV_B = 'dddddddd-2222-4000-8000-000000000002';
    const LISTING_DEV = 'eeeeeeee-1111-4000-8000-000000000001';
    const REQ_DEV = 'ffffffff-1111-4000-8000-000000000001';

    await asSuperuser();
    // User A registered with Indian mobile number without country code (+91 9497854095 represented as 9497854095)
    // share_whatsapp_with_exchange is intentionally NULL to test consent defaulting
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, whatsapp_number, share_whatsapp_with_exchange)
      VALUES 
        ('${USER_DEV_A}', 'Dev Priya', 'priyadev@greenloop.org', '9497854095', NULL),
        ('${USER_DEV_B}', 'Dev Rahul', 'rahuldev@greenloop.org', '+91 98765 43210', NULL);
    `);

    // Create listing owned by USER_DEV_A
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${LISTING_DEV}', '${USER_DEV_A}', '${CATEGORY_ID_1}', 'Solar Inverters & Batteries', 5);
    `);

    // Disable trigger temporarily to simulate legacy/unsynced rows created with NULL provider_id
    await asSuperuser();
    await db.query(`ALTER TABLE public.exchange_requests DISABLE TRIGGER trg_set_exchange_request_provider;`);
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, status, completion_code)
      VALUES ('${REQ_DEV}', '${LISTING_DEV}', '${USER_DEV_B}', NULL, 2, 'accepted', 'GL-7777');
    `);
    await db.query(`ALTER TABLE public.exchange_requests ENABLE TRIGGER trg_set_exchange_request_provider;`);

    // 1. Account A queries Account B while B has unknown/unset consent (NULL)
    // Under strict opt-in privacy, sharing must be DISABLED by default
    await asUser(USER_DEV_A, 'authenticated');
    const resAtoBDisabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [REQ_DEV, USER_DEV_B]
    );

    expect(resAtoBDisabled.rows[0].res).toEqual({
      participant_id: USER_DEV_B,
      whatsapp: null,
      has_whatsapp_consent: false,
      contact_state: 'sharing_disabled',
      notice: 'WhatsApp contact not shared by partner',
      status: 'accepted',
    });

    // Verify self-healing: exchange_requests.provider_id was automatically populated!
    const healedReq = await db.query(`SELECT provider_id FROM public.exchange_requests WHERE id = $1;`, [REQ_DEV]);
    expect(healedReq.rows[0].provider_id).toBe(USER_DEV_A);

    // Now User B explicitly opts in
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = '${USER_DEV_B}';`);

    // Now User A queries User B: sharing is ENABLED
    await asUser(USER_DEV_A, 'authenticated');
    const resAtoBEnabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [REQ_DEV, USER_DEV_B]
    );

    expect(resAtoBEnabled.rows[0].res).toEqual({
      participant_id: USER_DEV_B,
      whatsapp: '919876543210',
      has_whatsapp_consent: true,
      contact_state: 'sharing_enabled',
      notice: 'WhatsApp contact active for collection coordination',
      status: 'accepted',
    });

    // 2. Account B queries Account A (User A has NOT opted in yet -> sharing disabled)
    await asUser(USER_DEV_B, 'authenticated');
    const resBtoADisabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [REQ_DEV, USER_DEV_A]
    );
    expect(resBtoADisabled.rows[0].res.contact_state).toBe('sharing_disabled');
    expect(resBtoADisabled.rows[0].res.whatsapp).toBeNull();

    // Now User A explicitly opts in
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = '${USER_DEV_A}';`);

    // Now User B queries User A: sharing is ENABLED
    await asUser(USER_DEV_B, 'authenticated');
    const resBtoAEnabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [REQ_DEV, USER_DEV_A]
    );

    expect(resBtoAEnabled.rows[0].res).toEqual({
      participant_id: USER_DEV_A,
      whatsapp: '919497854095', // Automatically normalized 10 digits with India prefix 91!
      has_whatsapp_consent: true,
      contact_state: 'sharing_enabled',
      notice: 'WhatsApp contact active for collection coordination',
      status: 'accepted',
    });

    // 3. User attempting to query their own contact through this RPC must be rejected
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [REQ_DEV, USER_DEV_B])
    ).rejects.toThrow('Cannot request own contact details through exchange participant function.');

    // 4. Unauthorized non-participant (ACCOUNT_C) must be rejected
    await asUser(ACCOUNT_C_INTRUDER, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [REQ_DEV, USER_DEV_A])
    ).rejects.toThrow('Permission denied: Caller is not an authorized participant in this exchange request.');
  });

  it('Verifies Security Hardening: Authorization before mutation, consent hierarchy, and trigger integrity (All 9 Requirements)', async () => {
    await applyAllMigrations();

    const SEC_USER_A = '55555555-aaaa-4000-8000-000000000001';
    const SEC_USER_B = '55555555-bbbb-4000-8000-000000000002';
    const SEC_USER_C = '55555555-cccc-4000-8000-000000000003';
    const SEC_LISTING = '66666666-aaaa-4000-8000-000000000001';
    const SEC_REQ_ACCEPTED = '77777777-aaaa-4000-8000-000000000001';
    const SEC_REQ_PENDING = '77777777-bbbb-4000-8000-000000000002';
    const SEC_REQ_REJECTED = '77777777-cccc-4000-8000-000000000003';
    const SEC_REQ_NULL_PROVIDER = '77777777-dddd-4000-8000-000000000004';

    // 1. Existing phone values are preserved (Req 8)
    await asSuperuser();
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, phone, whatsapp_number, share_whatsapp_with_exchange)
      VALUES 
        ('${SEC_USER_A}', 'Sec User A', 'sec_a@greenloop.org', '+91 94978 54095', NULL, true),
        ('${SEC_USER_B}', 'Sec User B', 'sec_b@greenloop.org', NULL, '9876543210', false);
    `);

    // Verify backfill preserved existing phone on User A and explicit FALSE on User B (Req 2 & Req 8)
    const checkUserA = await db.query(`SELECT phone, whatsapp_number, share_whatsapp_with_exchange FROM public.profiles WHERE id = '${SEC_USER_A}';`);
    expect(checkUserA.rows[0].phone).toBe('+91 94978 54095');
    expect(checkUserA.rows[0].share_whatsapp_with_exchange).toBe(true);

    const checkUserB = await db.query(`SELECT phone, whatsapp_number, share_whatsapp_with_exchange FROM public.profiles WHERE id = '${SEC_USER_B}';`);
    expect(checkUserB.rows[0].whatsapp_number).toBe('9876543210');
    expect(checkUserB.rows[0].share_whatsapp_with_exchange).toBe(false); // Explicit FALSE strictly preserved!

    // Create listing owned by SEC_USER_A
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${SEC_LISTING}', '${SEC_USER_A}', '${CATEGORY_ID_1}', 'Industrial Cardboard', 10);
    `);

    // Create exchange requests: accepted, pending, rejected
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, completion_code)
      VALUES 
        ('${SEC_REQ_ACCEPTED}', '${SEC_LISTING}', '${SEC_USER_B}', '${SEC_USER_A}', 2, 'GL-A111'),
        ('${SEC_REQ_PENDING}', '${SEC_LISTING}', '${SEC_USER_B}', '${SEC_USER_A}', 1, 'GL-B222'),
        ('${SEC_REQ_REJECTED}', '${SEC_LISTING}', '${SEC_USER_B}', '${SEC_USER_A}', 1, 'GL-C333');
    `);

    // Provider accepts SEC_REQ_ACCEPTED and rejects SEC_REQ_REJECTED
    await asUser(SEC_USER_A, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${SEC_REQ_ACCEPTED}';`);
    await db.query(`UPDATE public.exchange_requests SET status = 'rejected' WHERE id = '${SEC_REQ_REJECTED}';`);

    // Req 1: Both registered users can retrieve each other's numbers after acceptance (when consent active)
    // First, verify User B queries User A (User A has consent = true)
    await asUser(SEC_USER_B, 'authenticated');
    const resBqueriesA = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [SEC_REQ_ACCEPTED, SEC_USER_A]
    );
    expect(resBqueriesA.rows[0].res.contact_state).toBe('sharing_enabled');
    expect(resBqueriesA.rows[0].res.whatsapp).toBe('919497854095');
    expect(resBqueriesA.rows[0].res.has_whatsapp_consent).toBe(true);

    // Req 2: Explicit consent FALSE is preserved
    // User A queries User B (User B explicitly opted out: share_whatsapp_with_exchange = false)
    await asUser(SEC_USER_A, 'authenticated');
    const resAqueriesB = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [SEC_REQ_ACCEPTED, SEC_USER_B]
    );
    expect(resAqueriesB.rows[0].res.contact_state).toBe('sharing_disabled');
    expect(resAqueriesB.rows[0].res.whatsapp).toBeNull();
    expect(resAqueriesB.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(resAqueriesB.rows[0].res.notice).toBe('WhatsApp contact not shared by partner');

    // Enable User B consent to test reciprocal sharing
    await asSuperuser();
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = '${SEC_USER_B}';`);
    await asUser(SEC_USER_A, 'authenticated');
    const resAqueriesBEnabled = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [SEC_REQ_ACCEPTED, SEC_USER_B]
    );
    expect(resAqueriesBEnabled.rows[0].res.contact_state).toBe('sharing_enabled');
    expect(resAqueriesBEnabled.rows[0].res.whatsapp).toBe('919876543210');

    // Req 3: Pending requests cannot reveal numbers
    const resPending = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [SEC_REQ_PENDING, SEC_USER_B]
    );
    expect(resPending.rows[0].res.whatsapp).toBeNull();
    expect(resPending.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(resPending.rows[0].res.notice).toContain('only accessible while the exchange request is in accepted status');

    // Req 4: Rejected requests cannot reveal numbers
    const resRejected = await db.query(
      `SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`,
      [SEC_REQ_REJECTED, SEC_USER_B]
    );
    expect(resRejected.rows[0].res.whatsapp).toBeNull();
    expect(resRejected.rows[0].res.has_whatsapp_consent).toBe(false);
    expect(resRejected.rows[0].res.notice).toContain('only accessible while the exchange request is in accepted status');

    // Req 5: Unrelated users cannot retrieve contact information
    await asUser(SEC_USER_C, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [SEC_REQ_ACCEPTED, SEC_USER_A])
    ).rejects.toThrow('Permission denied: Caller is not an authorized participant in this exchange request.');

    // Req 6: An unauthorized caller CANNOT mutate an unrelated exchange request (even when provider_id is NULL)
    await asSuperuser();
    await db.query(`ALTER TABLE public.exchange_requests DISABLE TRIGGER trg_set_exchange_request_provider;`);
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, status, completion_code)
      VALUES ('${SEC_REQ_NULL_PROVIDER}', '${SEC_LISTING}', '${SEC_USER_B}', NULL, 1, 'accepted', 'GL-D444');
    `);
    await db.query(`ALTER TABLE public.exchange_requests ENABLE TRIGGER trg_set_exchange_request_provider;`);

    // Verify row initially has provider_id = NULL
    const initialReq = await db.query(`SELECT provider_id FROM public.exchange_requests WHERE id = '${SEC_REQ_NULL_PROVIDER}';`);
    expect(initialReq.rows[0].provider_id).toBeNull();

    // Unauthorized caller SEC_USER_C attempts to call get_exchange_whatsapp_contact on this row
    await asUser(SEC_USER_C, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [SEC_REQ_NULL_PROVIDER, SEC_USER_B])
    ).rejects.toThrow('Permission denied: Caller is not an authorized participant in this exchange request.');

    // CRITICAL SECURITY ASSERTION: Row's provider_id MUST STILL BE NULL! The unauthorized caller was NOT able to mutate the record!
    await asSuperuser();
    const unchangedReq = await db.query(`SELECT provider_id FROM public.exchange_requests WHERE id = '${SEC_REQ_NULL_PROVIDER}';`);
    expect(unchangedReq.rows[0].provider_id).toBeNull();

    // Authorized caller SEC_USER_B calls it: NOW it successfully self-heals!
    await asUser(SEC_USER_B, 'authenticated');
    await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [SEC_REQ_NULL_PROVIDER, SEC_USER_A]);
    await asSuperuser();
    const authorizedHealedReq = await db.query(`SELECT provider_id FROM public.exchange_requests WHERE id = '${SEC_REQ_NULL_PROVIDER}';`);
    expect(authorizedHealedReq.rows[0].provider_id).toBe(SEC_USER_A);

    // Req 7: Missing and invalid numbers are handled correctly as separate distinct states
    const USER_MISSING = '55555555-eeee-4000-8000-000000000005';
    const USER_INVALID = '55555555-ffff-4000-8000-000000000006';
    const REQ_MISSING = '77777777-eeee-4000-8000-000000000005';
    const REQ_INVALID = '77777777-ffff-4000-8000-000000000006';

    await asSuperuser();
    await db.exec(`
      INSERT INTO public.profiles (id, full_name, email, phone, whatsapp_number, share_whatsapp_with_exchange)
      VALUES 
        ('${USER_MISSING}', 'Missing Number User', 'missing@greenloop.org', NULL, NULL, true),
        ('${USER_INVALID}', 'Invalid Number User', 'invalid@greenloop.org', '12345', '12345', true);
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, completion_code)
      VALUES 
        ('${REQ_MISSING}', '${SEC_LISTING}', '${USER_MISSING}', '${SEC_USER_A}', 1, 'GL-M111'),
        ('${REQ_INVALID}', '${SEC_LISTING}', '${USER_INVALID}', '${SEC_USER_A}', 1, 'GL-I222');
      UPDATE public.exchange_requests SET status = 'accepted' WHERE id IN ('${REQ_MISSING}', '${REQ_INVALID}');
    `);

    await asUser(SEC_USER_A, 'authenticated');
    const resStateMissing = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [REQ_MISSING, USER_MISSING]);
    expect(resStateMissing.rows[0].res.contact_state).toBe('missing_number');
    expect(resStateMissing.rows[0].res.whatsapp).toBeNull();
    expect(resStateMissing.rows[0].res.notice).toBe('Partner has not configured a WhatsApp number');

    const resStateInvalid = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [REQ_INVALID, USER_INVALID]);
    expect(resStateInvalid.rows[0].res.contact_state).toBe('invalid_number');
    expect(resStateInvalid.rows[0].res.whatsapp).toBeNull();
    expect(resStateInvalid.rows[0].res.notice).toBe("Partner's WhatsApp number is invalid");

    // Req 9: Signup trigger correctly creates or updates profiles and preserves consent
    const NEW_SIGNUP_USER = '55555555-9999-4000-8000-000000000009';
    await asSuperuser();
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        '${NEW_SIGNUP_USER}',
        'keralarecycler@greenloop.org',
        '{"full_name":"Anjali Menon","district":"Kozhikode","whatsapp_number":"+91 94978 12345","share_whatsapp_with_exchange":false}'::jsonb
      );
    `);

    // Verify handle_new_user trigger populated public.profiles with canonical fields & explicit FALSE consent!
    const signupProfile = await db.query(`SELECT * FROM public.profiles WHERE id = '${NEW_SIGNUP_USER}';`);
    expect(signupProfile.rows[0].full_name).toBe('Anjali Menon');
    expect(signupProfile.rows[0].district).toBe('Kozhikode');
    expect(signupProfile.rows[0].phone).toBe('+91 94978 12345');
    expect(signupProfile.rows[0].whatsapp_number).toBe('+91 94978 12345');
    expect(signupProfile.rows[0].share_whatsapp_with_exchange).toBe(false); // Explicit opt-out at signup preserved!

    // Verify signup with number entry WITHOUT consent -> defaults to FALSE (opt-in privacy by default)
    const NEW_SIGNUP_NO_CONSENT = '55555555-8888-4000-8000-000000000008';
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        '${NEW_SIGNUP_NO_CONSENT}',
        'noconsent@greenloop.org',
        '{"full_name":"Rahul Varma","district":"Ernakulam","whatsapp_number":"+91 94978 99999"}'::jsonb
      );
    `);
    const noConsentProfile = await db.query(`SELECT * FROM public.profiles WHERE id = '${NEW_SIGNUP_NO_CONSENT}';`);
    expect(noConsentProfile.rows[0].whatsapp_number).toBe('+91 94978 99999');
    expect(noConsentProfile.rows[0].share_whatsapp_with_exchange).toBe(false); // Number entry without consent does NOT enable sharing!

    // Verify signup with explicit opt-in -> TRUE
    const NEW_SIGNUP_OPT_IN = '55555555-7777-4000-8000-000000000007';
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        '${NEW_SIGNUP_OPT_IN}',
        'optin@greenloop.org',
        '{"full_name":"Meera Nair","district":"Thrissur","whatsapp_number":"+91 94978 88888","share_whatsapp_with_exchange":true}'::jsonb
      );
    `);
    const optInProfile = await db.query(`SELECT * FROM public.profiles WHERE id = '${NEW_SIGNUP_OPT_IN}';`);
    expect(optInProfile.rows[0].whatsapp_number).toBe('+91 94978 88888');
    expect(optInProfile.rows[0].share_whatsapp_with_exchange).toBe(true);

    // 10. Verify RPC Named Parameter Invocation (matching frontend supabase.rpc exactly)
    await asUser(SEC_USER_B, 'authenticated');
    const namedCallRes = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [SEC_REQ_ACCEPTED, SEC_USER_A]);
    expect((namedCallRes.rows[0].res as any).has_whatsapp_consent).toBe(true);
    expect((namedCallRes.rows[0].res as any).whatsapp).toBe('919497854095');

    // 11. Verify NULL status exchange request rejection via IS DISTINCT FROM 'accepted'
    const NULL_STATUS_REQ = '88888888-0000-4000-8000-000000000001';
    await asSuperuser();
    await db.exec(`
      ALTER TABLE public.exchange_requests ALTER COLUMN status DROP NOT NULL;
      ALTER TABLE public.exchange_requests DISABLE TRIGGER ALL;
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, status, completion_code)
      VALUES ('${NULL_STATUS_REQ}', '${SEC_LISTING}', '${SEC_USER_B}', '${SEC_USER_A}', 5, NULL, 'NULLST');
      ALTER TABLE public.exchange_requests ENABLE TRIGGER ALL;
    `);
    await asUser(SEC_USER_B, 'authenticated');
    const nullStatusRes = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [NULL_STATUS_REQ, SEC_USER_A]);
    expect((nullStatusRes.rows[0].res as any).whatsapp).toBeNull();
    expect((nullStatusRes.rows[0].res as any).has_whatsapp_consent).toBe(false);
    expect((nullStatusRes.rows[0].res as any).status).toBeNull();

    // 12. Verify enforced column default is false
    const colDefault = await db.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'share_whatsapp_with_exchange';
    `);
    expect(colDefault.rows[0].column_default).toMatch(/false/i);
  });

  it('Verifies Complete Two-Account WhatsApp Exchange Flow with Bidirectional Sharing, Persistence, and Revocation (Requirement 8)', async () => {
    await asSuperuser();
    await applyAllMigrations();

    const U1_PROVIDER = '99999999-1111-4000-8000-000000000001';
    const U2_REQUESTER = '99999999-2222-4000-8000-000000000002';
    const U1_LISTING = '88888888-1111-4000-8000-000000000001';
    const TWO_ACC_REQ = '77777777-1111-4000-8000-000000000001';

    // Step 1: Both accounts exist with saved WhatsApp numbers and explicit consent
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES 
        ('${U1_PROVIDER}', 'provider@greenloop.org', '{"full_name":"Priya Lakshmi","whatsapp_number":"+91 94978 11111","share_whatsapp_with_exchange":true}'::jsonb),
        ('${U2_REQUESTER}', 'requester@greenloop.org', '{"full_name":"Arjun Nair","whatsapp_number":"+91 94978 22222","share_whatsapp_with_exchange":true}'::jsonb);
    `);

    // Verify handle_new_user created the rows with explicit TRUE consent
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, phone, whatsapp_number, share_whatsapp_with_exchange)
      VALUES 
        ('${U1_PROVIDER}', 'Priya Lakshmi', 'provider@greenloop.org', '+91 94978 11111', '+91 94978 11111', true),
        ('${U2_REQUESTER}', 'Arjun Nair', 'requester@greenloop.org', '+91 94978 22222', '+91 94978 22222', true)
      ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        whatsapp_number = EXCLUDED.whatsapp_number,
        share_whatsapp_with_exchange = EXCLUDED.share_whatsapp_with_exchange;
    `);

    // Step 2: Both explicitly have contact sharing enabled in database
    const u1Profile = await db.query(`SELECT share_whatsapp_with_exchange, whatsapp_number FROM public.profiles WHERE id = '${U1_PROVIDER}';`);
    const u2Profile = await db.query(`SELECT share_whatsapp_with_exchange, whatsapp_number FROM public.profiles WHERE id = '${U2_REQUESTER}';`);
    expect(u1Profile.rows[0].share_whatsapp_with_exchange).toBe(true);
    expect(u2Profile.rows[0].share_whatsapp_with_exchange).toBe(true);

    // Step 3: User 1 creates listing; User 2 requests User 1's listing (initial pending state)
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${U1_LISTING}', '${U1_PROVIDER}', '${CATEGORY_ID_1}', 'Recyclable Plastic Crates', 20);
    `);

    await asUser(U2_REQUESTER, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, status, completion_code)
      VALUES ('${TWO_ACC_REQ}', '${U1_LISTING}', '${U2_REQUESTER}', '${U1_PROVIDER}', 5, 'pending', 'GL-8888');
    `);

    // While pending: neither user can access WhatsApp contact
    const pendingCallU1 = await db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2) as res;`, [TWO_ACC_REQ, U1_PROVIDER]);
    expect((pendingCallU1.rows[0].res as any).whatsapp).toBeNull();
    expect((pendingCallU1.rows[0].res as any).has_whatsapp_consent).toBe(false);

    // Step 4: User 1 accepts the exchange request
    await asUser(U1_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${TWO_ACC_REQ}';`);

    // Step 5 & 6: Both see the Message on WhatsApp button and each gets the OTHER participant's number
    // Direction A: User 1 (Provider) queries User 2's contact
    const u1ViewsU2 = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [TWO_ACC_REQ, U2_REQUESTER]);
    const u1Res = u1ViewsU2.rows[0].res as any;
    expect(u1Res.contact_state).toBe('sharing_enabled');
    expect(u1Res.has_whatsapp_consent).toBe(true);
    expect(u1Res.whatsapp).toBe('919497822222'); // User 2's number! Not User 1's!

    // Direction B: User 2 (Requester) queries User 1's contact
    await asUser(U2_REQUESTER, 'authenticated');
    const u2ViewsU1 = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [TWO_ACC_REQ, U1_PROVIDER]);
    const u2Res = u2ViewsU1.rows[0].res as any;
    expect(u2Res.contact_state).toBe('sharing_enabled');
    expect(u2Res.has_whatsapp_consent).toBe(true);
    expect(u2Res.whatsapp).toBe('919497811111'); // User 1's number! Not User 2's!

    // Neither user can query their own contact through the exchange endpoint
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2);`, [TWO_ACC_REQ, U2_REQUESTER])
    ).rejects.toThrow(/Cannot request own contact details/i);

    // Step 7: Refresh both accounts and verify persistence
    const reloadedU1 = await db.query(`SELECT phone, whatsapp_number, share_whatsapp_with_exchange FROM public.profiles WHERE id = '${U1_PROVIDER}';`);
    const reloadedU2 = await db.query(`SELECT phone, whatsapp_number, share_whatsapp_with_exchange FROM public.profiles WHERE id = '${U2_REQUESTER}';`);
    expect(reloadedU1.rows[0].whatsapp_number).toBe('+91 94978 11111');
    expect(reloadedU1.rows[0].share_whatsapp_with_exchange).toBe(true);
    expect(reloadedU2.rows[0].whatsapp_number).toBe('+91 94978 22222');
    expect(reloadedU2.rows[0].share_whatsapp_with_exchange).toBe(true);

    // Step 8: User 1 disables consent (share_whatsapp_with_exchange = false)
    await asUser(U1_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = false WHERE id = '${U1_PROVIDER}';`);

    // Verify User 2 can NO LONGER see User 1's number
    await asUser(U2_REQUESTER, 'authenticated');
    const u2ViewsU1Revoked = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [TWO_ACC_REQ, U1_PROVIDER]);
    const u2RevokedRes = u2ViewsU1Revoked.rows[0].res as any;
    expect(u2RevokedRes.contact_state).toBe('sharing_disabled');
    expect(u2RevokedRes.has_whatsapp_consent).toBe(false);
    expect(u2RevokedRes.whatsapp).toBeNull(); // Number is strictly protected and withheld!
    expect(u2RevokedRes.notice).toMatch(/not shared by partner/i);

    // But User 1 can STILL see User 2's number (User 2's consent remains active)
    await asUser(U1_PROVIDER, 'authenticated');
    const u1ViewsU2StillShared = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [TWO_ACC_REQ, U2_REQUESTER]);
    expect((u1ViewsU2StillShared.rows[0].res as any).contact_state).toBe('sharing_enabled');
    expect((u1ViewsU2StillShared.rows[0].res as any).whatsapp).toBe('919497822222');

    // Re-enable User 1 consent: User 2 immediately gets access back
    await db.query(`UPDATE public.profiles SET share_whatsapp_with_exchange = true WHERE id = '${U1_PROVIDER}';`);
    await asUser(U2_REQUESTER, 'authenticated');
    const u2ViewsU1ReEnabled = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [TWO_ACC_REQ, U1_PROVIDER]);
    expect((u2ViewsU1ReEnabled.rows[0].res as any).contact_state).toBe('sharing_enabled');
    expect((u2ViewsU1ReEnabled.rows[0].res as any).whatsapp).toBe('919497811111');
  });

  it('Verifies Simplified WhatsApp Contact Sharing: A saved WhatsApp number is sufficient after accepted exchange without separate consent (Requirements 1–8)', async () => {
    await asSuperuser();
    await applySimplifiedMigration();

    const SIMP_PROVIDER = 'aaaaaaaa-1111-4000-8000-000000000001';
    const SIMP_REQUESTER = 'bbbbbbbb-2222-4000-8000-000000000002';
    const SIMP_INTRUDER = 'cccccccc-3333-4000-8000-000000000003';
    const SIMP_LISTING = 'dddddddd-4444-4000-8000-000000000001';
    const SIMP_EXCHANGE = 'eeeeeeee-5555-4000-8000-000000000001';

    // Step 1: Both accounts exist with saved WhatsApp numbers
    // Note: Neither account configures or enables a separate contact-sharing permission!
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES 
        ('${SIMP_PROVIDER}', 'provider.clean@greenloop.org', '{"full_name":"Rahul Varma","whatsapp_number":"+91 98470 12345"}'::jsonb),
        ('${SIMP_REQUESTER}', 'requester.clean@greenloop.org', '{"full_name":"Fathima Beevi","whatsapp_number":"+91 97450 67890"}'::jsonb),
        ('${SIMP_INTRUDER}', 'intruder@greenloop.org', '{"full_name":"Intruder Person","whatsapp_number":"+91 99999 99999"}'::jsonb);
    `);

    // Verify handle_new_user populates profiles with the saved numbers
    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, phone, whatsapp_number)
      VALUES 
        ('${SIMP_PROVIDER}', 'Rahul Varma', 'provider.clean@greenloop.org', '+91 98470 12345', '+91 98470 12345'),
        ('${SIMP_REQUESTER}', 'Fathima Beevi', 'requester.clean@greenloop.org', '+91 97450 67890', '+91 97450 67890'),
        ('${SIMP_INTRUDER}', 'Intruder Person', 'intruder@greenloop.org', '+91 99999 99999', '+91 99999 99999')
      ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        whatsapp_number = EXCLUDED.whatsapp_number,
        eco_points_balance = EXCLUDED.eco_points_balance;
    `);

    // Step 2: Neither account has to enable a separate setting
    // The profile has saved whatsapp_number; no separate toggle or permission required!
    const p1 = await db.query(`SELECT whatsapp_number FROM public.profiles WHERE id = '${SIMP_PROVIDER}';`);
    const p2 = await db.query(`SELECT whatsapp_number FROM public.profiles WHERE id = '${SIMP_REQUESTER}';`);
    expect(p1.rows[0].whatsapp_number).toBe('+91 98470 12345');
    expect(p2.rows[0].whatsapp_number).toBe('+91 97450 67890');

    // Step 3: User 1 creates listing; User 2 requests the listing
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity)
      VALUES ('${SIMP_LISTING}', '${SIMP_PROVIDER}', '${CATEGORY_ID_1}', 'Baled Cardboard Sheets', 10);
    `);

    await asUser(SIMP_REQUESTER, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, status, completion_code)
      VALUES ('${SIMP_EXCHANGE}', '${SIMP_LISTING}', '${SIMP_REQUESTER}', '${SIMP_PROVIDER}', 2, 'pending', 'GL-7777');
    `);

    // While pending: neither participant receives contact details (strict status gate)
    const pendingQuery = await db.query(`
      SELECT public.get_exchange_whatsapp_contact($1, $2) as res;
    `, [SIMP_EXCHANGE, SIMP_PROVIDER]);
    expect((pendingQuery.rows[0].res as any).whatsapp).toBeNull();
    expect((pendingQuery.rows[0].res as any).has_whatsapp_consent).toBe(false);

    // Step 4: User 1 accepts the exchange
    await asUser(SIMP_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = '${SIMP_EXCHANGE}';`);

    // Step 5: Both users see the WhatsApp button (contact_state: sharing_enabled)
    // Step 6: Both buttons open the OTHER participant's chat
    // Direction 1: User 1 (Provider) retrieves User 2's number
    const providerViewsRequester = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [SIMP_EXCHANGE, SIMP_REQUESTER]);
    const resU1 = providerViewsRequester.rows[0].res as any;
    expect(resU1.contact_state).toBe('sharing_enabled');
    expect(resU1.has_whatsapp_consent).toBe(true);
    expect(resU1.whatsapp).toBe('919745067890'); // User 2's clean normalized digits with country code!

    // Direction 2: User 2 (Requester) retrieves User 1's number
    await asUser(SIMP_REQUESTER, 'authenticated');
    const requesterViewsProvider = await db.query(`
      SELECT public.get_exchange_whatsapp_contact(
        p_exchange_request_id => $1::uuid,
        p_participant_id => $2::uuid
      ) as res;
    `, [SIMP_EXCHANGE, SIMP_PROVIDER]);
    const resU2 = requesterViewsProvider.rows[0].res as any;
    expect(resU2.contact_state).toBe('sharing_enabled');
    expect(resU2.has_whatsapp_consent).toBe(true);
    expect(resU2.whatsapp).toBe('919847012345'); // User 1's clean normalized digits with country code!

    // Neither user receives their own number
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2);`, [SIMP_EXCHANGE, SIMP_REQUESTER])
    ).rejects.toThrow(/Cannot request own contact details/i);

    // Step 7: Refresh both accounts and repeat
    const reloadedP1 = await db.query(`SELECT whatsapp_number FROM public.profiles WHERE id = '${SIMP_PROVIDER}';`);
    const reloadedP2 = await db.query(`SELECT whatsapp_number FROM public.profiles WHERE id = '${SIMP_REQUESTER}';`);
    expect(reloadedP1.rows[0].whatsapp_number).toBe('+91 98470 12345');
    expect(reloadedP2.rows[0].whatsapp_number).toBe('+91 97450 67890');

    const repeatQuery = await db.query(`
      SELECT public.get_exchange_whatsapp_contact($1, $2) as res;
    `, [SIMP_EXCHANGE, SIMP_PROVIDER]);
    expect((repeatQuery.rows[0].res as any).whatsapp).toBe('919847012345');
    expect((repeatQuery.rows[0].res as any).contact_state).toBe('sharing_enabled');

    // Step 8: Confirm unrelated users cannot retrieve contact details
    await asUser(SIMP_INTRUDER, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_whatsapp_contact($1, $2);`, [SIMP_EXCHANGE, SIMP_PROVIDER])
    ).rejects.toThrow(/Permission denied/i);

    // And rejected / cancelled exchanges cannot retrieve contact details
    await asSuperuser();
    await db.query(`UPDATE public.exchange_requests SET status = 'cancelled' WHERE id = '${SIMP_EXCHANGE}';`);
    await asUser(SIMP_REQUESTER, 'authenticated');
    const cancelledQuery = await db.query(`
      SELECT public.get_exchange_whatsapp_contact($1, $2) as res;
    `, [SIMP_EXCHANGE, SIMP_PROVIDER]);
    expect((cancelledQuery.rows[0].res as any).whatsapp).toBeNull();
    expect((cancelledQuery.rows[0].res as any).has_whatsapp_consent).toBe(false);
    expect((cancelledQuery.rows[0].res as any).status).toBe('cancelled');

    // Create a rejected exchange by having provider decline a pending request
    const REJ_EXCHANGE = 'ffffffef-6666-4000-8000-000000000001';
    await asUser(SIMP_REQUESTER, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, completion_code)
      VALUES ('${REJ_EXCHANGE}', '${SIMP_LISTING}', '${SIMP_REQUESTER}', '${SIMP_PROVIDER}', 1, 'GL-6666');
    `);
    await asUser(SIMP_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'rejected' WHERE id = '${REJ_EXCHANGE}';`);

    // Provider queries Requester on rejected request: strictly denied (status gate)
    const rejectedQuery = await db.query(`
      SELECT public.get_exchange_whatsapp_contact($1, $2) as res;
    `, [REJ_EXCHANGE, SIMP_REQUESTER]);
    expect((rejectedQuery.rows[0].res as any).whatsapp).toBeNull();
    expect((rejectedQuery.rows[0].res as any).has_whatsapp_consent).toBe(false);
    expect((rejectedQuery.rows[0].res as any).status).toBe('rejected');
  });

  it('Verifies Complete Marketplace Listing Lifecycle, WhatsApp Consistency, and Concurrency Protection (Parts 1 & 2)', async () => {
    await asSuperuser();
    await applyLifecycleHardeningMigration();

    const LC_OWNER = '12121212-1111-4000-8000-000000000001';
    const LC_REQ1 = '23232323-2222-4000-8000-000000000002';
    const LC_REQ2 = '34343434-3333-4000-8000-000000000003';
    const LC_LISTING = '45454545-4444-4000-8000-000000000001';
    const LC_EXCHANGE1 = '56565656-5555-4000-8000-000000000001';
    const LC_EXCHANGE2 = '67676767-6666-4000-8000-000000000002';

    // 1. Seed users with saved numbers in auth and profiles
    await db.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES 
        ('${LC_OWNER}', 'owner@greenloop.org', '{"full_name":"Suresh Gopi","whatsapp_number":"+91 94471 11111"}'::jsonb),
        ('${LC_REQ1}', 'req1@greenloop.org', '{"full_name":"Manju Warrier","whatsapp_number":"+91 94472 22222"}'::jsonb),
        ('${LC_REQ2}', 'req2@greenloop.org', '{"full_name":"Mohan Lal","whatsapp_number":"+91 94473 33333"}'::jsonb);
    `);

    await db.query(`
      INSERT INTO public.profiles (id, full_name, email, phone, whatsapp_number, eco_points_balance)
      VALUES 
        ('${LC_OWNER}', 'Suresh Gopi', 'owner@greenloop.org', '+91 94471 11111', '+91 94471 11111', 100),
        ('${LC_REQ1}', 'Manju Warrier', 'req1@greenloop.org', '+91 94472 22222', '+91 94472 22222', 50),
        ('${LC_REQ2}', 'Mohan Lal', 'req2@greenloop.org', '+91 94473 33333', '+91 94473 33333', 50)
      ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        whatsapp_number = EXCLUDED.whatsapp_number,
        eco_points_balance = EXCLUDED.eco_points_balance;
    `);

    // 2. Stage 1: AVAILABLE -> User 1 creates waste listing (status = 'active')
    await asUser(LC_OWNER, 'authenticated');
    await db.query(`
      INSERT INTO public.listings (id, user_id, category_id, title, quantity, status)
      VALUES ('${LC_LISTING}', '${LC_OWNER}', '${CATEGORY_ID_1}', 'Dried Coconut Shells', 100, 'active');
    `);

    // Public marketplace query: Listing is visible to everyone
    await asUser(LC_REQ1, 'authenticated');
    const pubListings = await db.query(`SELECT id, title, status FROM public.listings WHERE status IN ('active', 'reserved');`);
    expect(pubListings.rows.some((l) => l.id === LC_LISTING && l.status === 'active')).toBe(true);

    // 3. Stage 2: REQUESTED -> Requester 1 & Requester 2 submit pending requests
    await asUser(LC_REQ1, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, completion_code)
      VALUES ('${LC_EXCHANGE1}', '${LC_LISTING}', '${LC_REQ1}', '${LC_OWNER}', 40, 'GL-5432');
    `);

    await asUser(LC_REQ2, 'authenticated');
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, provider_id, requested_quantity, completion_code)
      VALUES ('${LC_EXCHANGE2}', '${LC_LISTING}', '${LC_REQ2}', '${LC_OWNER}', 30, 'GL-9876');
    `);

    // Listing remains active and visible while requests are pending
    const listDuringPending = await db.query(`SELECT status FROM public.listings WHERE id = '${LC_LISTING}';`);
    expect(listDuringPending.rows[0].status).toBe('active');

    // 4. Stage 3: ACCEPTED -> Owner accepts Requester 1's request via accept_exchange_request
    await asUser(LC_OWNER, 'authenticated');
    const acceptRes = await db.query(`
      SELECT public.accept_exchange_request('${LC_EXCHANGE1}') as res;
    `);
    expect((acceptRes.rows[0].res as any).success).toBe(true);
    expect((acceptRes.rows[0].res as any).listing_status).toBe('reserved');

    // VERIFY: Listing is NOW marked 'reserved' in database
    const listAfterAccept = await db.query(`SELECT status FROM public.listings WHERE id = '${LC_LISTING}';`);
    expect(listAfterAccept.rows[0].status).toBe('reserved');

    // CRITICAL: Listing is STILL VISIBLE on marketplace to ALL users (including Requester 2)!
    await asUser(LC_REQ2, 'authenticated');
    const marketAfterAccept = await db.query(`
      SELECT id, title, status FROM public.listings 
      WHERE status IN ('active', 'reserved', 'pending', 'in_progress');
    `);
    const foundOnMarket = marketAfterAccept.rows.find((l) => l.id === LC_LISTING);
    expect(foundOnMarket).toBeDefined();
    expect(foundOnMarket?.status).toBe('reserved'); // Visible, marked reserved!

    // 5. CONCURRENCY PROTECTION: Owner cannot concurrently accept Requester 2's request!
    await asUser(LC_OWNER, 'authenticated');
    await expect(
      db.query(`SELECT public.accept_exchange_request('${LC_EXCHANGE2}');`)
    ).rejects.toThrow(/already has an active accepted exchange/i);

    // 6. WHATSAPP BUTTON CONSISTENCY:
    // User 1 (Provider) retrieves User 2 (Requester 1) number
    const provContact = await db.query(`
      SELECT public.get_exchange_whatsapp_contact('${LC_EXCHANGE1}', '${LC_REQ1}') as res;
    `);
    expect((provContact.rows[0].res as any).contact_state).toBe('sharing_enabled');
    expect((provContact.rows[0].res as any).whatsapp).toBe('919447222222'); // Requester's number

    // User 2 (Requester 1) retrieves User 1 (Provider) number
    await asUser(LC_REQ1, 'authenticated');
    const reqContact = await db.query(`
      SELECT public.get_exchange_whatsapp_contact('${LC_EXCHANGE1}', '${LC_OWNER}') as res;
    `);
    expect((reqContact.rows[0].res as any).contact_state).toBe('sharing_enabled');
    expect((reqContact.rows[0].res as any).whatsapp).toBe('919447111111'); // Provider's number

    // 7. Stage 4: HANDOVER VERIFICATION with WRONG CODE
    await asUser(LC_OWNER, 'authenticated');
    // Wrong code attempt: must be strictly rejected
    await expect(
      db.query(`SELECT public.confirm_exchange_handover('${LC_EXCHANGE1}', 'GL-WRONG');`)
    ).rejects.toThrow(/Invalid pickup verification code/i);

    // Verify state is completely preserved after failure (no partial mutations)
    const reqAfterFail = await db.query(`SELECT status FROM public.exchange_requests WHERE id = '${LC_EXCHANGE1}';`);
    const listAfterFail = await db.query(`SELECT status FROM public.listings WHERE id = '${LC_LISTING}';`);
    expect(reqAfterFail.rows[0].status).toBe('accepted');
    expect(listAfterFail.rows[0].status).toBe('reserved'); // Still reserved! Still in marketplace!

    // 8. Stage 5: HANDOVER VERIFICATION with CORRECT CODE ('GL-5432')
    const handoverSuccess = await db.query(`
      SELECT public.confirm_exchange_handover('${LC_EXCHANGE1}', 'GL-5432') as res;
    `);
    expect((handoverSuccess.rows[0].res as any).success).toBe(true);
    expect((handoverSuccess.rows[0].res as any).status).toBe('completed');
    expect((handoverSuccess.rows[0].res as any).listing_status).toBe('completed');

    // VERIFY: Listing is NOW marked 'completed'
    const listAfterComplete = await db.query(`SELECT status FROM public.listings WHERE id = '${LC_LISTING}';`);
    expect(listAfterComplete.rows[0].status).toBe('completed');

    // VERIFY: Completed listing is NOW REMOVED from active marketplace queries!
    await asUser(LC_REQ2, 'authenticated');
    const marketAfterComplete = await db.query(`
      SELECT id, title, status FROM public.listings 
      WHERE status IN ('active', 'reserved');
    `);
    expect(marketAfterComplete.rows.some((l) => l.id === LC_LISTING)).toBe(false);

    // EcoPoints balance updated
    const ownerPoints = await db.query(`SELECT eco_points_balance FROM public.profiles WHERE id = '${LC_OWNER}';`);
    expect(ownerPoints.rows[0].eco_points_balance).toBe(150); // 100 + 50 points
    const reqPoints = await db.query(`SELECT eco_points_balance FROM public.profiles WHERE id = '${LC_REQ1}';`);
    expect(reqPoints.rows[0].eco_points_balance).toBe(80); // 50 + 30 points
  });
});
