# GREENLOOP — SECURITY ARCHITECTURE AND THREAT MODEL

## 1. Overview
Security in **GreenLoop** is an architectural imperative designed to safeguard multi-party circular transactions across households, commercial kitchens, farms, and recycling facilities.

---

## 2. Row Level Security (RLS) Policies
PostgreSQL Row Level Security (RLS) is enforced across all 16 tables in Supabase:

1. **`profiles`**:
   - `SELECT`: Publicly readable by all authenticated and anonymous clients (allows viewing generator profiles).
   - `UPDATE`: Strictly restricted to `auth.uid() = id`.
   - **Role Escalation Protection**: Database triggers prevent regular users from altering their assigned `role` or incrementing `eco_points_balance` directly.

2. **`listings`**:
   - `SELECT`: Anyone can view `active` listings. Cancelled listings are restricted to creator and administrators.
   - `INSERT`: Allowed only when `auth.uid() = user_id`.
   - `UPDATE` / `DELETE`: Strictly restricted to `auth.uid() = user_id` or `role = 'admin'`.

3. **`exchange_requests`**:
   - `SELECT`: Only accessible by the requesting party (`auth.uid() = requester_id`) OR the listing owner.
   - `INSERT`: Authenticated users can request listings (`auth.uid() = requester_id`).
   - `UPDATE`: Limited to participants. Status transitions (`pending` -> `accepted` -> `completed`) must follow finite-state integrity constraints.

4. **`transactions`**:
   - Immutable write-once ledger. Transactions can only be generated via the verified database function `handle_completed_transaction()` triggered upon valid handover code entry.
   - Direct `UPDATE` or `DELETE` on transactions is revoked.

5. **`eco_points`**:
   - `SELECT`: Users may only read their own ledger (`auth.uid() = user_id`).
   - Direct `INSERT` / `UPDATE` revoked from client roles (`anon`, `authenticated`). All point credits originate from server-side database triggers or Edge Functions.

---

## 3. Handover Cryptographic Security Code
To prevent fraudulent claims or phantom collections:
1. When a generator accepts an exchange request, the system issues a pseudorandom 6-character cryptographic pickup verification code (e.g., `GL-8924`).
2. The code is delivered only to the requester's authenticated session.
3. Upon physical handover, the requester presents the code to the generator.
4. The generator submits the code to verify the transaction.
5. If valid, the database marks the exchange complete, computes carbon savings, and awards points to both parties.
6. The request and listing statuses are updated simultaneously to prevent duplicate payouts.

---

## 4. API Key Hygiene & Secret Protection
- **No Service Role Keys Committed**: Client bundles only reference `VITE_SUPABASE_ANON_KEY`, which is constrained by RLS.
- **Gemini API Key Isolation**: When deploying to production, Gemini API invocations are proxied through Supabase Edge Functions (`/functions/v1/gemini-scanner`), keeping the Google AI Studio private key server-side.
- **Client Input Sanitization**: File uploads are verified for MIME-type (`image/jpeg`, `image/png`, `image/webp`) and capped at 10MB to mitigate denial-of-service and buffer injection vectors.

---

## 5. Audit Logging & Non-Repudiation
All sensitive platform mutations (listing deletions, admin approvals, centre verifications, disputes) are captured in `public.audit_logs` with actor UUIDs, timestamps, and previous/new JSON states.
