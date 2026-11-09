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

    await db.exec(fs.readFileSync(mig0, 'utf8'));
    await db.exec(fs.readFileSync(mig1, 'utf8'));
    await db.exec(fs.readFileSync(mig2, 'utf8'));
    await db.exec(fs.readFileSync(mig3, 'utf8'));
    await db.exec(fs.readFileSync(mig4, 'utf8'));
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
  });

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
});
