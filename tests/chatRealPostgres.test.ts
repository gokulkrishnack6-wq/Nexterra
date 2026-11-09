import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('GreenLoop Private Chat & Contact Sharing — Real PostgreSQL Integration Tests', () => {
  let db: PGlite;

  const ACCOUNT_A_PROVIDER = '11111111-1111-4000-8000-000000000001';
  const ACCOUNT_B_REQUESTER = '22222222-2222-4000-8000-000000000002';
  const ACCOUNT_C_INTRUDER = '33333333-3333-4000-8000-000000000003';

  const LISTING_ID_1 = 'aaaaaaaa-aaaa-4000-8000-000000000001';
  const CATEGORY_ID_1 = 'cccccccc-cccc-4000-8000-000000000001';

  async function asUser(userId: string | null, role: 'authenticated' | 'anon' = 'authenticated') {
    await db.query(`SET ROLE ${role};`);
    if (userId) {
      await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [userId]);
    } else {
      await db.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
    }
  }

  async function asSuperuser() {
    await db.query(`RESET ROLE;`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false);`);
  }

  beforeEach(async () => {
    db = new PGlite();

    // 1. Setup base schema
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
        ('${LISTING_ID_1}', '${ACCOUNT_A_PROVIDER}', '${CATEGORY_ID_1}', '50 Clean HDPE Drums', 50, 'kg', 'active');

      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    `);

    // 2. Apply previous exchange requests migration
    const exchMigrationPath = path.resolve(__dirname, '../supabase/migrations/20261109000000_exchange_requests_and_notifications.sql');
    await db.exec(fs.readFileSync(exchMigrationPath, 'utf8'));

    // 3. Apply new chat & contact sharing migration
    const chatMigrationPath = path.resolve(__dirname, '../supabase/migrations/20261109010000_private_chat_and_contact_sharing.sql');
    await db.exec(fs.readFileSync(chatMigrationPath, 'utf8'));
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('Migration idempotency: chat migration runs cleanly a second time', async () => {
    const chatMigrationPath = path.resolve(__dirname, '../supabase/migrations/20261109010000_private_chat_and_contact_sharing.sql');
    await expect(db.exec(fs.readFileSync(chatMigrationPath, 'utf8'))).resolves.toBeDefined();
  });

  it('Requirement 1 & 4: Submitting an exchange request automatically creates a conversation with initial message', async () => {
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

    // Verify initial message was inserted
    const msgRes = await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [conv.id]);
    expect(msgRes.rows.length).toBe(1);
    expect(msgRes.rows[0].sender_id).toBe(ACCOUNT_B_REQUESTER);
    expect(msgRes.rows[0].message_text).toBe('Hello Anoop, can I pick this up tomorrow afternoon?');
  });

  it('Requirement 1 & 5: Two-way live chat: Account A and B can message each other, and notifications are triggered', async () => {
    // 1. Create request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-2222-4000-8000-000000000002';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Requesting drums for community project', 'GL-5555'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const convId = convRow.id;

    // 2. Account A (Provider) replies
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    const msgARes = await db.query(`
      INSERT INTO public.messages (conversation_id, sender_id, message_text)
      VALUES ($1, $2, 'Sure Bina! You can collect from our warehouse in Kochi after 2 PM.')
      RETURNING id, message_text;
    `, [convId, ACCOUNT_A_PROVIDER]);
    expect(msgARes.rows.length).toBe(1);

    // 3. Verify notification triggered for Account B (Requester)
    await asSuperuser();
    const notifsForB = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC;`, [ACCOUNT_B_REQUESTER]);
    expect(notifsForB.rows.some((n: any) => n.title === 'New Message' && n.message.includes('Anoop Provider'))).toBe(true);

    // 4. Account B replies back
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const msgBRes = await db.query(`
      INSERT INTO public.messages (conversation_id, sender_id, message_text)
      VALUES ($1, $2, 'Great, see you at 2:30 PM!')
      RETURNING id, message_text;
    `, [convId, ACCOUNT_B_REQUESTER]);
    expect(msgBRes.rows.length).toBe(1);

    // 5. Verify notification triggered for Account A (Provider)
    await asSuperuser();
    const notifsForA = await db.query(`SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC;`, [ACCOUNT_A_PROVIDER]);
    expect(notifsForA.rows.some((n: any) => n.title === 'New Message' && n.message.includes('Bina Requester'))).toBe(true);
  });

  it('Requirement 7: Account C (Intruder) cannot view, join, or inject messages into the conversation', async () => {
    // Account B creates request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-3333-4000-8000-000000000003';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Initial note', 'GL-6666'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const convId = convRow.id;

    // Switch to Account C (Intruder)
    await asUser(ACCOUNT_C_INTRUDER, 'authenticated');

    // SELECT on conversations: returns 0 rows
    const cConvs = await db.query(`SELECT * FROM public.conversations WHERE id = $1;`, [convId]);
    expect(cConvs.rows.length).toBe(0);

    // SELECT on messages: returns 0 rows
    const cMsgs = await db.query(`SELECT * FROM public.messages WHERE conversation_id = $1;`, [convId]);
    expect(cMsgs.rows.length).toBe(0);

    // INSERT into messages: blocked by RLS & trigger
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'Hacked message from Charlie');
      `, [convId, ACCOUNT_C_INTRUDER])
    ).rejects.toThrow();
  });

  it('Requirement 7: Anonymous user has zero access to conversations or messages', async () => {
    await asUser(null, 'anon');

    await expect(db.query(`SELECT * FROM public.conversations;`)).rejects.toThrow(/permission denied/i);
    await expect(db.query(`SELECT * FROM public.messages;`)).rejects.toThrow(/permission denied/i);
  });

  it('Requirement 10: Conversation becomes read-only when request is rejected or completed', async () => {
    // 1. Create request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-4444-4000-8000-000000000004';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Can I collect?', 'GL-7777'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const convId = convRow.id;

    // 2. Account A declines request
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`UPDATE public.exchange_requests SET status = 'rejected' WHERE id = $1;`, [reqId]);

    // 3. Verify conversation status transitioned to read_only
    await asSuperuser();
    const convStatus = await db.query(`SELECT status FROM public.conversations WHERE id = $1;`, [convId]);
    expect(convStatus.rows[0].status).toBe('read_only');

    // 4. Attempting to send a message throws an exception
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    await expect(
      db.query(`
        INSERT INTO public.messages (conversation_id, sender_id, message_text)
        VALUES ($1, $2, 'Why did you reject?');
      `, [convId, ACCOUNT_B_REQUESTER])
    ).rejects.toThrow(/Conversation is read-only/);
  });

  it('Requirement 8: Contact sharing privacy: phone and WhatsApp are shielded until user explicitly consents', async () => {
    // 1. Create request
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const reqId = 'bbbbbbbb-5555-4000-8000-000000000005';
    await db.query(`
      INSERT INTO public.exchange_requests (
        id, listing_id, requester_id, requested_quantity, message, completion_code
      ) VALUES (
        $1, $2, $3, 10, 'Request with contact check', 'GL-8888'
      );
    `, [reqId, LISTING_ID_1, ACCOUNT_B_REQUESTER]);

    await asSuperuser();
    const convRow = (await db.query(`SELECT id FROM public.conversations WHERE exchange_request_id = $1;`, [reqId])).rows[0];
    const convId = convRow.id;

    // 2. Account B asks for Account A's contact without consent
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const contactNoConsent = await db.query(
      `SELECT public.get_exchange_participant_contact($1, $2) as res;`,
      [convId, ACCOUNT_A_PROVIDER]
    );
    const data1 = contactNoConsent.rows[0].res;
    expect(data1.has_phone_consent).toBe(false);
    expect(data1.has_whatsapp_consent).toBe(false);
    expect(data1.phone).toBeNull();
    expect(data1.whatsapp).toBeNull();

    // 3. Account A updates profile and grants consent for phone and whatsapp
    await asUser(ACCOUNT_A_PROVIDER, 'authenticated');
    await db.query(`
      UPDATE public.profiles
      SET phone = '+919876543210',
          whatsapp_number = '+919876543210',
          share_phone_with_exchange = true,
          share_whatsapp_with_exchange = true
      WHERE id = $1;
    `, [ACCOUNT_A_PROVIDER]);

    // 4. Account B requests contact again: Now numbers are securely revealed
    await asUser(ACCOUNT_B_REQUESTER, 'authenticated');
    const contactWithConsent = await db.query(
      `SELECT public.get_exchange_participant_contact($1, $2) as res;`,
      [convId, ACCOUNT_A_PROVIDER]
    );
    const data2 = contactWithConsent.rows[0].res;
    expect(data2.has_phone_consent).toBe(true);
    expect(data2.has_whatsapp_consent).toBe(true);
    expect(data2.phone).toBe('+919876543210');
    expect(data2.whatsapp).toBe('+919876543210');

    // 5. Account C (Intruder) tries to call get_exchange_participant_contact: Blocked
    await asUser(ACCOUNT_C_INTRUDER, 'authenticated');
    await expect(
      db.query(`SELECT public.get_exchange_participant_contact($1, $2);`, [convId, ACCOUNT_A_PROVIDER])
    ).rejects.toThrow(/Caller is not a participant in this conversation/);
  });
});

