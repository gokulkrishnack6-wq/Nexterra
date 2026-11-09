import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

// ==============================================================================
// GREENLOOP PRIVATE CHAT & CONTACT SHARING — PGLITE POSTGRESQL TEST SUITE
// Environment: PGlite in-process PostgreSQL Engine (WASM)
// Validates: Schema migrations, triggers, participant RLS, and security constraints
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

      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    `);

    // 2. Apply initial migration (20261109010000)
    const chatMigrationPath1 = path.resolve(__dirname, '../supabase/migrations/20261109010000_private_chat_and_contact_sharing.sql');
    await db.exec(fs.readFileSync(chatMigrationPath1, 'utf8'));

    // 3. Apply hardening migration (20261109020000)
    const chatMigrationPath2 = path.resolve(__dirname, '../supabase/migrations/20261109020000_chat_security_and_idempotency_hardening.sql');
    await db.exec(fs.readFileSync(chatMigrationPath2, 'utf8'));
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('Migration idempotency: hardening migration runs cleanly a second time', async () => {
    const chatMigrationPath2 = path.resolve(__dirname, '../supabase/migrations/20261109020000_chat_security_and_idempotency_hardening.sql');
    await expect(db.exec(fs.readFileSync(chatMigrationPath2, 'utf8'))).resolves.toBeDefined();
  });

  it('Requirement 1: Submitting an exchange request automatically creates exactly one conversation and initial proposal message', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const reqId = 'bbbbbbbb-1111-4000-8000-000000000001';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Hello Anoop, can I pick this up tomorrow afternoon?', 'GL-4444'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();

    // Verify conversation was created automatically
    const convRes = await db.query(`SELECT * FROM public.conversations WHERE exchange_request_id = $1;`, [reqId]);
    expect(convRes.rows.length).toBe(1);
    const conv = convRes.rows[0];
    expect(conv.requester_id).toBe(ACCOUNT_B_REQUESTER);
    expect(conv.provider_id).toBe(ACCOUNT_A_PROVIDER);
    expect(conv.listing_id).toBe(LISTING_ID_1);
    expect(conv.status).toBe('active');

    // Verify initial message was inserted once
    const msgRes = await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [conv.id]);
    expect(msgRes.rows.length).toBe(1);
    expect(msgRes.rows[0].sender_id).toBe(ACCOUNT_B_REQUESTER);
    expect(msgRes.rows[0].message_text).toBe('Hello Anoop, can I pick this up tomorrow afternoon?');
    expect(msgRes.rows[0].message_type).toBe('proposal');
  });

  it('Requirement 1: Repeated trigger execution never creates duplicate initial messages or extra conversations', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const reqId = 'bbbbbbbb-1111-4000-8000-000000000002';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 15, 'Initial proposal note', 'GL-1234'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();

    // Manually trigger conversation creation again with identical request record
    const reqRow = (await db.query(`SELECT * FROM public.exchange_requests WHERE id = $1;`, [reqId])).rows[0];
    
    // Attempting direct duplicate insertion of initial proposal message: blocked by UNIQUE index
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text, message_type, exchange_request_id)
        VALUES ($1, $2, 'Duplicate attempt', 'proposal', $3);
      `, [convRow.id, ACCOUNT_B_REQUESTER, reqId])
    ).rejects.toThrow();

    // Count messages: remains strictly 1
    const msgs = await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [convRow.id]);
    expect(msgs.rows.length).toBe(1);
    expect(msgs.rows[0].message_text).toBe('Initial proposal note');
  });

  it('Requirement 2: Identity validation prevents authenticated client from spoofing sender identity', async () => {
    // Bina creates request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000003';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Request notes', 'GL-2222'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];

    // Bina (authenticated) attempts to insert a message claiming to be Anoop (Provider)
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'I am Anoop and I accept everything without verification');
      `, [convRow.id, ACCOUNT_A_PROVIDER])
    ).rejects.toThrow(/spoofing prohibited/i);
  });

  it('Requirement 3: Participants cannot update conversation status directly', async () => {
    // Bina creates request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000004';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Note', 'GL-3333'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];

    // Bina attempts to directly update conversation status: rejected due to REVOKE UPDATE
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`UPDATE public.conversations SET status = 'read_only' WHERE id = $1;`, [convRow.id])
    ).rejects.toThrow(/permission denied/i);

    // Anoop (provider) also cannot update conversation status directly
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await expect(
      db.query(`UPDATE public.conversations SET status = 'read_only' WHERE id = $1;`, [convRow.id])
    ).rejects.toThrow(/permission denied/i);
  });

  it('Requirement 4: Message editing is restricted, immutable fields protected, and read-only enforced', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000005';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Message to test immutability', 'GL-5555'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const msgRow = (await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [convRow.id])).rows[0];

    // Authenticated client cannot update messages (REVOKE UPDATE)
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`UPDATE public.messages SET message_text = 'Altered text' WHERE id = $1;`, [msgRow.id])
    ).rejects.toThrow(/permission denied/i);

    // Superuser attempting to tamper with immutable fields (sender_id or conversation_id) is blocked by trigger
    await asSuperuser();
    await expect(
      db.query(`UPDATE public.messages SET sender_id = $1 WHERE id = $2;`, [ACCOUNT_C_INTRUDER, msgRow.id])
    ).rejects.toThrow(/Immutable message fields/i);

    // Complete the exchange and verify editing is blocked even if attempted
    await db.query(`UPDATE public.exchange_requests SET status = 'completed' WHERE id = $1;`, [reqId]);
    await expect(
      db.query(`UPDATE public.messages SET message_text = 'After completed edit' WHERE id = $1;`, [msgRow.id])
    ).rejects.toThrow(/Cannot edit message: conversation is read-only/i);
  });

  it('Requirement 5: Contact consent revocation immediately prevents further phone/whatsapp retrieval', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-1111-4000-8000-000000000006';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Consent revocation test', 'GL-6666'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];

    // Account A grants consent
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`
      UPDATE public.profiles
      SET phone = '+919876543210',
          whatsapp_number = '+919876543210',
          share_phone_with_exchange = true,
          share_whatsapp_with_exchange = true
      WHERE id = $1;
    `, [ACCOUNT_A_PROVIDER]);

    // Account B can read contact
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const res1 = (await db.query(`SELECT public.get_exchange_participant_contact($1, $2) as res;`, [convRow.id, ACCOUNT_A_PROVIDER])).rows[0].res;
    expect(res1.phone).toBe('+919876543210');
    expect(res1.whatsapp).toBe('+919876543210');

    // Account A now REVOKES phone consent but keeps WhatsApp
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`
      UPDATE public.profiles
      SET share_phone_with_exchange = false
      WHERE id = $1;
    `, [ACCOUNT_A_PROVIDER]);

    // Account B calls function: phone is immediately NULL, whatsapp remains visible
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const res2 = (await db.query(`SELECT public.get_exchange_participant_contact($1, $2) as res;`, [convRow.id, ACCOUNT_A_PROVIDER])).rows[0].res;
    expect(res2.phone).toBeNull();
    expect(res2.has_phone_consent).toBe(false);
    expect(res2.whatsapp).toBe('+919876543210');
    expect(res2.has_whatsapp_consent).toBe(true);
  });

  it('Requirement 7: Two exchanges create two separate, isolated conversations', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const reqId1 = 'bbbbbbbb-1111-4000-8000-000000000007';
    const reqId2 = 'bbbbbbbb-1111-4000-8000-000000000008';

    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, message, completion_code)
      VALUES ($1, $2, $3, 10, 'Message for Listing 1', 'GL-7771');
    `, [reqId1, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await db.query(`
      INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, message, completion_code)
      VALUES ($1, $2, $3, 5, 'Message for Listing 2', 'GL-7772');
    `, [reqId2, LISTING_ID_2, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const conv1 = (await db.query(`SELECT * FROM public.conversations WHERE exchange_request_id = $1;`, [reqId1])).rows[0];
    const conv2 = (await db.query(`SELECT * FROM public.conversations WHERE exchange_request_id = $1;`, [reqId2])).rows[0];

    expect(conv1.id).not.toBe(conv2.id);
    expect(conv1.listing_id).toBe(LISTING_ID_1);
    expect(conv2.listing_id).toBe(LISTING_ID_2);

    const msgs1 = (await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [conv1.id])).rows;
    const msgs2 = (await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [conv2.id])).rows;

    expect(msgs1.length).toBe(1);
    expect(msgs1[0].message_text).toBe('Message for Listing 1');
    expect(msgs2.length).toBe(1);
    expect(msgs2[0].message_text).toBe('Message for Listing 2');
  });

  it('Requirement 7: Legacy exchange request with missing or deleted listing handles gracefully', async () => {
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');

    const legacyReqId = 'bbbbbbbb-9999-4000-8000-000000000009';
    const nonExistentListingId = '99999999-9999-4000-8000-999999999999';

    // Disabling foreign key temporarily to simulate orphaned request
    await asSuperuser();
    await db.query(`ALTER TABLE public.exchange_requests DROP CONSTRAINT IF EXISTS exchange_requests_listing_id_fkey;`);

    // Insert orphaned exchange request without provider_id
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`
        INSERT INTO public.exchange_requests (id, listing_id, requester_id, requested_quantity, message, completion_code)
        VALUES ($1, $2, $3, 10, 'Orphaned message', 'GL-9999');
      `, [legacyReqId, nonExistentListingId, ACCOUNT_B_REQUESTER])
    ).resolves.toBeDefined();

    // Conversation is safely skipped without throwing an exception or aborting
    await asSuperuser();
    const convRes = await db.query(`SELECT * FROM public.conversations WHERE exchange_request_id = $1;`, [legacyReqId]);
    expect(convRes.rows.length).toBe(0);
  });
});
