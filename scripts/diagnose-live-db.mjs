import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, '.env');

function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceKey || anonKey);

const mask = (str) => {
  if (!str) return 'null';
  const s = String(str);
  if (s.length <= 4) return '***';
  return s.slice(0, 3) + '****' + s.slice(-3);
};

async function diagnose() {
  console.log('=== GREENLOOP LIVE DATABASE DIAGNOSTIC ===');
  console.log('Supabase URL:', supabaseUrl.replace(/https:\/\/(.*)\.supabase\.co.*/, 'https://$1.supabase.co'));
  console.log('Using Service Role Key:', Boolean(serviceKey));

  // Check specific columns on profiles
  console.log('\n--- 1b. COLUMN EXISTENCE ON PROFILES ---');
  const cols = ['id', 'full_name', 'email', 'phone', 'phone_number', 'whatsapp_number', 'mobile', 'whatsapp', 'share_whatsapp_with_exchange'];
  for (const c of cols) {
    const { error } = await client.from('profiles').select(c).limit(1);
    if (error && error.code === '42703') {
      console.log(`  profiles.${c}: DOES NOT EXIST`);
    } else if (error && error.code === '42501') {
      console.log(`  profiles.${c}: EXISTS (permission denied)`);
    } else if (error) {
      console.log(`  profiles.${c}: error ${error.code} - ${error.message}`);
    } else {
      console.log(`  profiles.${c}: EXISTS and readable!`);
    }
  }

  // 2. Check exchange_requests table
  console.log('\n--- 2. EXCHANGE_REQUESTS RECORDS ---');
  const { data: requests, error: reqErr } = await client
    .from('exchange_requests')
    .select('id, listing_id, requester_id, provider_id, status, requested_quantity, completion_code, created_at');

  if (reqErr) {
    console.error('Error querying exchange_requests:', reqErr);
  } else if (!requests || requests.length === 0) {
    console.log('No exchange requests found.');
  } else {
    console.log(`Found ${requests.length} exchange requests:`);
    for (const r of requests) {
      console.log(`  Request ID: ${r.id}`);
      console.log(`    listing_id: ${r.listing_id}`);
      console.log(`    requester_id: ${r.requester_id}`);
      console.log(`    provider_id: ${r.provider_id}`);
      console.log(`    status: ${r.status}`);
      console.log(`    created_at: ${r.created_at}`);
    }
  }

  // 3. Check listings table
  console.log('\n--- 3. LISTINGS RECORDS ---');
  const { data: listings, error: listErr } = await client
    .from('listings')
    .select('id, title, user_id, status');

  if (listErr) {
    console.error('Error querying listings:', listErr);
  } else {
    console.log(`Found ${listings?.length || 0} listings:`);
    for (const l of (listings || []).slice(0, 5)) {
      console.log(`  Listing ID: ${l.id} | Title: "${l.title}" | Owner user_id: ${l.user_id} | Status: ${l.status}`);
    }
  }

  // 4. Test RPC get_exchange_whatsapp_contact and get_participant_contact
  console.log('\n--- 4. RPC TEST ---');
  const { data: rpcTest1, error: rpcErr1 } = await client.rpc('get_exchange_whatsapp_contact', {
    p_exchange_request_id: '00000000-0000-0000-0000-000000000000',
    p_participant_id: '00000000-0000-0000-0000-000000000000',
  });
  console.log('get_exchange_whatsapp_contact error:');
  console.log(' ', rpcErr1?.message);

  const { data: rpcTest2, error: rpcErr2 } = await client.rpc('get_exchange_participant_contact', {
    p_conversation_id: '00000000-0000-0000-0000-000000000000',
    p_participant_id: '00000000-0000-0000-0000-000000000000',
  });
  console.log('get_exchange_participant_contact error:');
  console.log(' ', rpcErr2?.message);

  const { data: rpcTest3, error: rpcErr3 } = await client.rpc('confirm_exchange_handover', {
    p_exchange_request_id: '00000000-0000-0000-0000-000000000000',
    p_completion_code: 'GL-1234',
  });
  console.log('confirm_exchange_handover error:');
  console.log(' ', rpcErr3?.message);

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

diagnose().catch(err => {
  console.error('Diagnostic failed with exception:', err);
  process.exit(1);
});
