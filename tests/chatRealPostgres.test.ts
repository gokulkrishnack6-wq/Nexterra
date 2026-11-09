import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// GREENLOOP PRIVATE CHAT & CONTACT SHARING — PGLITE POSTGRESQL TEST SUITE
// Environment: PGlite in-process PostgreSQL Engine (WASM)
// Validates: Full migration sequence (20261109000000 -> 20261109030000),
//            triggers, participant RLS, notification deduplication,
//            completion-code non-disclosure, and anti-spoofing boundaries.
// ==============================================================================

describe('GreenLoop Private Chat & Contact Sharing — PGlite In-Process PostgreSQL Tests', () => {
  let db: PGlite;

  const ACCOUNT_A_PROVIDER = '11111111-1111-4000-8000-000000000001';
  const ACCOUNT_B_REQUESTER = '22222222-2222-4000-8000-000000000002';
  const ACCOUNT_C_INTRUDER = '33333333-3333-4000-8000-000000000003';

  const LISTING_ID_1 = 'aaaaaaaa-aaaa-4000-8000-000000000001';
  const LISTING_ID_2 = 'aaaaaaaa-aaaa-4000-8000-000000000002';
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

  beforeEach(async () => {
    db = new PGlite();

    // 1. Setup base schema simulating Supabase environment
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS public;

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
        phone TEXT,
        role TEXT DEFAULT 'individual'
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
        listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
        requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

      INSERT INTO public.profiles (id, full_name, email, phone) VALUES
        ('${ACCOUNT_A_PROVIDER}', 'Anoop Provider', 'anoop@greenloop.in', '+919876543210'),
        ('${ACCOUNT_B_REQUESTER}', 'Bina Requester', 'bina@greenloop.in', '+919876543211'),
        ('${ACCOUNT_C_INTRUDER}', 'Charlie Intruder', 'charlie@greenloop.in', '+919876543212');

      INSERT INTO public.waste_categories (id, name, slug) VALUES
        ('${CATEGORY_ID_1}', 'Plastics', 'plastics');

      INSERT INTO public.listings (id, user_id, category_id, title, quantity, unit, status) VALUES
        ('${LISTING_ID_1}', '${ACCOUNT_A_PROVIDER}', '${CATEGORY_ID_1}', '50 Clean HDPE Drums', 50, 'kg', 'active'),
        ('${LISTING_ID_2}', '${ACCOUNT_A_PROVIDER}', '${CATEGORY_ID_1}', '20 Cardboard Cartons', 20, 'kg', 'active');

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    `);

    // 2. Apply complete migration sequence in order
    const mig0 = path.resolve(__dirname, '../supabase/migrations/20261109000000_exchange_requests_and_notifications.sql');
    const mig1 = path.resolve(__dirname, '../supabase/migrations/20261109010000_private_chat_and_contact_sharing.sql');
    const mig2 = path.resolve(__dirname, '../supabase/migrations/20261109020000_chat_security_and_idempotency_hardening.sql');
    const mig3 = path.resolve(__dirname, '../supabase/migrations/20261109030000_production_chat_and_notification_hardening.sql');

    await db.exec(fs.readFileSync(mig0, 'utf8'));
    await db.exec(fs.readFileSync(mig1, 'utf8'));
    await db.exec(fs.readFileSync(mig2, 'utf8'));
    await db.exec(fs.readFileSync(mig3, 'utf8'));
  }, 45000);

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('Requirement 7 & 6: Migration sequence 000000 -> 010000 -> 020000 -> 030000 executes cleanly and idempotently', async () => {
    // Re-applying 030000 must succeed cleanly without errors
    const mig3 = path.resolve(__dirname, '../supabase/migrations/20261109030000_production_chat_and_notification_hardening.sql');
    await expect(db.exec(fs.readFileSync(mig3, 'utf8'))).resolves.toBeDefined();
  });

  it('Requirement 5: Idempotency conflict resolution handles legacy messages with duplicate exchange_request_id without deleting chat history', async () => {
    await asSuperuser();

    // 1. Create an exchange request and initial message normally
    const legacyReqId = 'eeeeeeee-1111-4000-8000-000000000001';
    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, message, completion_code)
      VALUES ($1, $2, $3, 10, 'Initial request text', 'GL-0001');
    `, [legacyReqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    const convId = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [legacyReqId])).rows[0].id;

    // 2. Temporarily drop the unique constraint to simulate legacy unconstrained duplicate state
    await db.query(`ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS uq_messages_exchange_request;`);
    await db.query(`ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_exchange_request_id_key;`);

    // 3. Inject a legacy duplicate proposal message pointing to the same exchange_request_id
    const dupMsgId = 'dddddddd-2222-4000-8000-000000000002';
    await db.query(`
      INSERT INTO public.messages (id, conversation_id, sender_id, message_text, message_type, exchange_request_id, created_at)
      VALUES ($1, $2, $3, 'Second duplicate proposal message that must NOT be deleted', 'proposal', $4, NOW() + INTERVAL '1 second');
    `, [dupMsgId, convId, ACCOUNT_B_REQUESTER, legacyReqId]);

    // Verify 2 messages exist with the same exchange_request_id
    const dupsBefore = await db.query(`SELECT id, message_text FROM public.messages WHERE exchange_request_id = $1;`, [legacyReqId]);
    expect(dupsBefore.rows.length).toBe(2);

    // 4. Run migration 030000: conflict resolution must preserve all messages and set duplicate exchange_request_id to NULL
    const mig3 = path.resolve(__dirname, '../supabase/migrations/20261109030000_production_chat_and_notification_hardening.sql');
    await db.exec(fs.readFileSync(mig3, 'utf8'));

    // Verify ALL messages in conversation are preserved (count is STILL 2)
    const allMsgs = await db.query(`SELECT id, message_text, exchange_request_id FROM public.messages WHERE conversation_id = $1 ORDER BY created_at ASC;`, [convId]);
    expect(allMsgs.rows.length).toBe(2);
    expect(allMsgs.rows[0].exchange_request_id).toBe(legacyReqId);
    expect(allMsgs.rows[1].id).toBe(dupMsgId);
    expect(allMsgs.rows[1].exchange_request_id).toBeNull(); // Cleared proposal marker, preserved full text!
    expect(allMsgs.rows[1].message_text).toContain('must NOT be deleted');

    // Verify unique constraint is active: inserting a new duplicate throws unique violation
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text, message_type, exchange_request_id)
        VALUES ($1, $2, 'Illegal duplicate', 'proposal', $3);
      `, [convId, ACCOUNT_B_REQUESTER, legacyReqId])
    ).rejects.toThrow();
  });

  it('Requirement 2: Handover verification code is NEVER disclosed in ordinary notifications upon acceptance', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const reqId = 'bbbbbbbb-1111-4000-8000-000000000010';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Requesting drums', 'GL-7890'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    // Account A (Provider) accepts request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'accepted' WHERE id = $1;`, [reqId]);

    // Inspect notification generated for Account B (Requester)
    await asSuperuser();
    const notifsB = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC;`, [ACCOUNT_B_REQUESTER]);
    expect(notifsB.rows.length).toBe(1);
    expect(notifsB.rows[0].title).toBe('Request Accepted');
    // Critical Security Assertion: Completion code GL-7890 must NOT appear in notification
    expect(notifsB.rows[0].message).not.toContain('GL-7890');
    expect(notifsB.rows[0].message).toContain('accepted by the provider');
    expect(notifsB.rows[0].link).toBe(`/exchanges?req=${reqId}&chat=open`);
  });

  it('Requirement 3: Exactly ONE notification is created when request is submitted with an initial proposal message (no duplicate notifications)', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const reqId = 'bbbbbbbb-1111-4000-8000-000000000011';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Initial message with proposal', 'GL-1111'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();

    // Query notifications for Account A (Provider)
    const notifsA = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1;`, [ACCOUNT_A_PROVIDER]);
    // Exactly 1 notification generated (the request notification), NOT two!
    expect(notifsA.rows.length).toBe(1);
    expect(notifsA.rows[0].title).toBe('New Exchange Request');
    expect(notifsA.rows[0].message).toContain('Bina Requester requested 10 units');
  });

  it('Requirement 3: Regular chat messages DO trigger notifications for the recipient', async () => {
    // 1. Create request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000012';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Initial note', 'GL-2222'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];

    // 2. Account B sends a regular subsequent message
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await db.query(`
      INSERT INTO public.messages (conversation_id, sender_id, message_text)
      VALUES ($1, $2, 'Where should I come for collection?');
    `, [convRow.id, ACCOUNT_B_REQUESTER]);

    // 3. Provider A now has 2 notifications (1 for request creation, 1 for new message)
    await asSuperuser();
    const notifsA = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at ASC;`, [ACCOUNT_A_PROVIDER]);
    expect(notifsA.rows.length).toBe(2);
    expect(notifsA.rows[0].title).toBe('New Exchange Request');
    expect(notifsA.rows[1].title).toBe('New Message');
    expect(notifsA.rows[1].message).toContain('Bina Requester: Where should I come for collection?');
  });

  it('Requirement 4: validate_and_sync_message enforces server execution boundary and rejects unauthenticated/spoofed insertion', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000013';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Boundary test', 'GL-3333'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];

    // Authenticated client B cannot insert message as Provider A
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'Spoofed message');
      `, [convRow.id, ACCOUNT_A_PROVIDER])
    ).rejects.toThrow(/spoofing prohibited/i);

    // Anonymous user cannot insert messages
    await asUser(null, 'anon');
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'Anon message');
      `, [convRow.id, ACCOUNT_B_REQUESTER])
    ).rejects.toThrow();
  });

  it('Requirement 3 & 4: Status lockdown and message immutability remain strictly enforced', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000014';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Immutability test', 'GL-4444'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const msgRow = (await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [convRow.id])).rows[0];

    // Client cannot update conversations
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`UPDATE public.conversations SET status = 'read_only' WHERE id = $1;`, [convRow.id])
    ).rejects.toThrow(/permission denied/i);

    // Client cannot update messages
    await expect(
      db.query(`UPDATE public.messages SET message_text = 'Tampered' WHERE id = $1;`, [msgRow.id])
    ).rejects.toThrow(/permission denied/i);

    // Rejecting exchange makes conversation read-only
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'rejected' WHERE id = $1;`, [reqId]);

    // Inserting new message after rejection is blocked
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'Are you there?');
      `, [convRow.id, ACCOUNT_B_REQUESTER])
    ).rejects.toThrow(/Conversation is read-only/i);
  });
});
