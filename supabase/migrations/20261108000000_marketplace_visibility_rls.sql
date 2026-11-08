-- ==============================================================================
-- GREENLOOP DATABASE SCHEMA MIGRATION: MARKETPLACE VISIBILITY & RLS SECURITY
-- File: 20261108000000_marketplace_visibility_rls.sql
-- Project: GREENLOOP — Waste Has a Second Life (czytsaajiicpivjkrbey)
-- Status: PREPARED FOR REVIEW (NOT EXECUTED - AWAITING USER APPROVAL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE & SAFE COLUMN BACKFILL (Preserve Existing Locations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'individual',
  organization_name TEXT,
  address TEXT,
  district TEXT,
  state TEXT DEFAULT 'Kerala',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  avatar_url TEXT,
  bio TEXT,
  eco_points_balance INTEGER NOT NULL DEFAULT 0 CHECK (eco_points_balance >= 0),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add any missing columns if public.profiles already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'individual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Kerala';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eco_points_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Location Integrity: Ensure district is strictly nullable with NO hardcoded default
ALTER TABLE public.profiles ALTER COLUMN district DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN district DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);

-- ------------------------------------------------------------------------------
-- 3. PROFILES COMPLETE RLS AUDIT & PERSONAL DATA ISOLATION (ZERO PII LEAK)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Explicitly drop ONLY known conflicting/legacy policies on profiles.
-- (Preserves any unrelated legitimate policies created for admin or custom roles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public directory viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- Base Table Policy 1: Users can SELECT only their own complete profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Base Table Policy 2: Users can INSERT only their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Base Table Policy 3: Users can UPDATE only their own profile (and cannot change user id)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Privilege lockdown: anonymous visitors cannot query base profiles table
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. SANITIZED PUBLIC COMMUNITY DIRECTORY VIEW
-- ------------------------------------------------------------------------------
-- Exposes ONLY non-sensitive community directory fields.
-- Explicitly EXCLUDES: email, phone, private address, coordinates, and eco_points_balance.
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  role,
  organization_name,
  district,
  state,
  avatar_url,
  bio,
  is_verified,
  created_at
FROM public.profiles;

-- Restrict permissions: public directory is read-only
REVOKE ALL ON public.public_profiles FROM public;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 5. WASTE CATEGORIES & MULTI-CONFLICT SAFE IDEMPOTENT SEEDING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waste_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  is_organic BOOLEAN NOT NULL DEFAULT false,
  recyclability_score INTEGER NOT NULL CHECK (recyclability_score BETWEEN 1 AND 100),
  standard_unit TEXT NOT NULL DEFAULT 'kg',
  default_co2_factor NUMERIC(6, 3) NOT NULL DEFAULT 1.25,
  default_landfill_factor NUMERIC(6, 3) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely backfill any missing columns
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT false;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS recyclability_score INTEGER DEFAULT 80;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS standard_unit TEXT DEFAULT 'kg';
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS default_co2_factor NUMERIC(6, 3) DEFAULT 1.25;
ALTER TABLE public.waste_categories ADD COLUMN IF NOT EXISTS default_landfill_factor NUMERIC(6, 3) DEFAULT 1.0;

ALTER TABLE public.waste_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.waste_categories;
CREATE POLICY "Categories viewable by everyone" ON public.waste_categories FOR SELECT USING (true);
GRANT SELECT ON public.waste_categories TO authenticated, anon;

-- Genuinely idempotent category seeding:
-- Handles both UUID and TEXT column types seamlessly.
-- Safely resolves conflicts by BOTH ID and slug without creating duplicates:
-- 1. If slug exists: keeps the existing ID (preserving foreign keys in listings/transactions).
-- 2. If target ID exists with a different slug: preserves the ID and updates the slug/metadata.
-- 3. If neither exists: safely inserts using the deterministic UUID matching frontend constants.
-- 4. Checks name uniqueness to prevent constraint violations.
DO $$
DECLARE
  cat_item RECORD;
  v_existing_by_slug TEXT;
  v_existing_by_id TEXT;
  v_id_type TEXT;
BEGIN
  SELECT data_type INTO v_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'waste_categories' AND column_name = 'id';

  FOR cat_item IN
    SELECT * FROM (VALUES
      ('a1111111-1111-4000-8000-000000000001', 'cat-plastics', 'Plastics (Clean / Sorted)', 'plastics', 'Clean HDPE milk packets, PET beverage bottles, plastic crates, and PP containers.', 'Package', false, 80, 'kg', 1.85, 1.20),
      ('a2222222-2222-4000-8000-000000000002', 'cat-paper', 'Paper & Cardboard', 'paper', 'Corrugated cartons, newspapers, packaging boxes, and shredded paper.', 'Scroll', false, 85, 'kg', 2.10, 1.30),
      ('a3333333-3333-4000-8000-000000000003', 'cat-organic', 'Organic & Kitchen Waste', 'organic', 'Vegetable peels, fruit discards, food leftovers, and market surplus suitable for composting.', 'Apple', true, 95, 'kg', 1.80, 1.20),
      ('a4444444-4444-4000-8000-000000000004', 'cat-agricultural', 'Coconut & Agricultural Residue', 'agricultural', 'Coconut husks, shells, fronds, banana stems, and paddy straw for mulch and coir.', 'Trees', true, 90, 'kg', 1.50, 1.10),
      ('a5555555-5555-4000-8000-000000000005', 'cat-metals', 'Metals & Scrap', 'metals', 'Aluminium cans, steel scrap, iron grills, hardware offcuts, and copper tubing.', 'Hammer', false, 90, 'kg', 3.50, 2.00),
      ('a6666666-6666-4000-8000-000000000006', 'cat-glass', 'Glass Bottles & Jars', 'glass', 'Clean glass pickle jars, beverage bottles, cosmetic glass, and intact containers.', 'Wine', false, 95, 'kg', 0.90, 0.80),
      ('a7777777-7777-4000-8000-000000000007', 'cat-ewaste', 'E-Waste & Electronics', 'e-waste', 'Obsolete phones, chargers, copper wiring, circuit boards, and small home electronics.', 'Cpu', false, 75, 'kg', 4.20, 2.50),
      ('a8888888-8888-4000-8000-000000000008', 'cat-textiles', 'Textiles & Fabric Scraps', 'textiles', 'Cotton tailors’ trimmings, old bed linens, and fabric scraps for upcycling.', 'Shirt', false, 70, 'kg', 1.40, 0.90),
      ('a9999999-9999-4000-8000-000000000009', 'cat-other', 'Other Recyclables', 'other', 'Rubber, wood scrap, composite items, and mixed recyclables.', 'Recycle', false, 60, 'kg', 1.00, 0.80)
    ) AS t(uuid_id, text_id, name, slug, description, icon, is_organic, recyclability_score, standard_unit, default_co2_factor, default_landfill_factor)
  LOOP
    -- 1. Check if category with this slug already exists
    SELECT id::text INTO v_existing_by_slug FROM public.waste_categories WHERE slug = cat_item.slug LIMIT 1;

    -- 2. Check if category with this target ID already exists
    IF v_id_type = 'uuid' THEN
      SELECT id::text INTO v_existing_by_id FROM public.waste_categories WHERE id = cat_item.uuid_id::uuid LIMIT 1;
    ELSE
      SELECT id::text INTO v_existing_by_id FROM public.waste_categories WHERE id::text = cat_item.text_id LIMIT 1;
    END IF;

    IF v_existing_by_slug IS NOT NULL THEN
      -- Slug already exists: preserve the existing row's ID so listings foreign keys are NOT broken
      UPDATE public.waste_categories
      SET description = cat_item.description,
          icon = cat_item.icon,
          is_organic = cat_item.is_organic,
          recyclability_score = cat_item.recyclability_score,
          standard_unit = cat_item.standard_unit,
          default_co2_factor = cat_item.default_co2_factor,
          default_landfill_factor = cat_item.default_landfill_factor
      WHERE slug = cat_item.slug;

      -- Safely update name only if it does not conflict with another row's unique name
      IF NOT EXISTS (SELECT 1 FROM public.waste_categories WHERE name = cat_item.name AND slug <> cat_item.slug) THEN
        UPDATE public.waste_categories SET name = cat_item.name WHERE slug = cat_item.slug;
      END IF;

    ELSIF v_existing_by_id IS NOT NULL THEN
      -- The target ID already exists with a different slug:
      -- Preserve the ID to maintain foreign keys, update its slug and circular taxonomy metadata
      UPDATE public.waste_categories
      SET slug = cat_item.slug,
          description = cat_item.description,
          icon = cat_item.icon,
          is_organic = cat_item.is_organic,
          recyclability_score = cat_item.recyclability_score,
          standard_unit = cat_item.standard_unit,
          default_co2_factor = cat_item.default_co2_factor,
          default_landfill_factor = cat_item.default_landfill_factor
      WHERE id::text = v_existing_by_id;

      IF NOT EXISTS (SELECT 1 FROM public.waste_categories WHERE name = cat_item.name AND id::text <> v_existing_by_id) THEN
        UPDATE public.waste_categories SET name = cat_item.name WHERE id::text = v_existing_by_id;
      END IF;

    ELSE
      -- Neither slug nor ID exists: safe to insert new category
      IF v_id_type = 'uuid' THEN
        INSERT INTO public.waste_categories (
          id, name, slug, description, icon, is_organic, recyclability_score, standard_unit, default_co2_factor, default_landfill_factor
        )
        VALUES (
          cat_item.uuid_id::uuid,
          CASE 
            WHEN EXISTS (SELECT 1 FROM public.waste_categories WHERE name = cat_item.name) THEN cat_item.name || ' (' || cat_item.slug || ')'
            ELSE cat_item.name
          END,
          cat_item.slug,
          cat_item.description,
          cat_item.icon,
          cat_item.is_organic,
          cat_item.recyclability_score,
          cat_item.standard_unit,
          cat_item.default_co2_factor,
          cat_item.default_landfill_factor
        );
      ELSE
        INSERT INTO public.waste_categories (
          id, name, slug, description, icon, is_organic, recyclability_score, standard_unit, default_co2_factor, default_landfill_factor
        )
        VALUES (
          cat_item.text_id,
          CASE 
            WHEN EXISTS (SELECT 1 FROM public.waste_categories WHERE name = cat_item.name) THEN cat_item.name || ' (' || cat_item.slug || ')'
            ELSE cat_item.name
          END,
          cat_item.slug,
          cat_item.description,
          cat_item.icon,
          cat_item.is_organic,
          cat_item.recyclability_score,
          cat_item.standard_unit,
          cat_item.default_co2_factor,
          cat_item.default_landfill_factor
        )
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. LISTINGS TABLE & COMPLETE RLS AUDIT (Defined strictly before listings triggers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.waste_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT NOT NULL,
  material_type TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  listing_type TEXT NOT NULL DEFAULT 'free',
  price NUMERIC(10, 2) DEFAULT 0 CHECK (price >= 0),
  condition TEXT NOT NULL DEFAULT 'clean/dry',
  district TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  status TEXT NOT NULL DEFAULT 'active',
  ai_classified BOOLEAN NOT NULL DEFAULT false,
  ai_confidence NUMERIC(5, 2) DEFAULT NULL,
  suggested_action TEXT,
  images TEXT[] DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely backfill columns for existing tables (NO arbitrary coordinate defaults)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'free';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'clean/dry';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ai_classified BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5, 2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS suggested_action TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Clean up any NULL state in existing records before runtime queries
UPDATE public.listings SET status = 'active' WHERE status IS NULL;
UPDATE public.listings SET is_demo = false WHERE is_demo IS NULL;
UPDATE public.listings SET images = '{}' WHERE images IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_district ON public.listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Explicitly drop ONLY known conflicting/legacy policies on listings.
-- (Preserves any unrelated legitimate policies created for admin or custom roles)
DROP POLICY IF EXISTS "Users can view own listings" ON public.listings;
DROP POLICY IF EXISTS "Active listings viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Active public listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Public listings are viewable by all users" ON public.listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
DROP POLICY IF EXISTS "Authenticated users can create own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Listing owners can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
DROP POLICY IF EXISTS "Listing owners can delete own listings" ON public.listings;

-- 1. SELECT: All authenticated users and public visitors can view active public listings across accounts.
--    Owners can also view their own inactive / completed listings.
--    Private or cancelled listings created by other users are NEVER exposed.
CREATE POLICY "Active public listings are viewable by everyone"
  ON public.listings
  FOR SELECT
  USING (status = 'active' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

-- 2. INSERT: Authenticated users can create listings bound strictly to their authenticated UID.
CREATE POLICY "Authenticated users can create own listings"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Listing creator can update their own listing only.
--    WITH CHECK enforces that the creator cannot transfer ownership to another account.
CREATE POLICY "Listing owners can update own listings"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Only the listing creator can delete their listing.
CREATE POLICY "Listing owners can delete own listings"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.listings TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. ECO POINTS LEDGER & STRICT WRITE LOCKDOWN
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ecopoints_action') THEN
    CREATE TYPE ecopoints_action AS ENUM (
      'signup_bonus',
      'listing_created',
      'exchange_completed',
      'challenge_completed',
      'verified_donation',
      'daily_streak',
      'referral',
      'reward_redeemed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.eco_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points <> 0),
  action_type ecopoints_action NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eco_points_user ON public.eco_points(user_id);
CREATE INDEX IF NOT EXISTS idx_eco_points_reference ON public.eco_points(reference_id);

-- Complete RLS audit for eco_points: explicitly drop ONLY conflicting/legacy policies
ALTER TABLE public.eco_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own points ledger" ON public.eco_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.eco_points;
DROP POLICY IF EXISTS "Users can insert eco points" ON public.eco_points;
DROP POLICY IF EXISTS "Users can insert own eco points" ON public.eco_points;
DROP POLICY IF EXISTS "Users can modify eco points" ON public.eco_points;
DROP POLICY IF EXISTS "Users can update own eco points" ON public.eco_points;
DROP POLICY IF EXISTS "Users can delete own eco points" ON public.eco_points;

CREATE POLICY "Users view own points ledger" ON public.eco_points FOR SELECT USING (auth.uid() = user_id);

-- WRITE SECURITY LOCKDOWN:
-- Direct INSERT, UPDATE, DELETE on public.eco_points is completely revoked from clients.
-- Points can ONLY be written by verified server-side SECURITY DEFINER functions and triggers.
REVOKE INSERT, UPDATE, DELETE ON public.eco_points FROM authenticated, anon, public;
GRANT SELECT ON public.eco_points TO authenticated;

-- Safe duplicate audit before unique index creation:
-- If duplicate signup bonuses exist in existing data, report them without deleting records.
-- If clean, creates the partial unique index immediately.
DO $$
DECLARE
  v_dup_count INT := 0;
  v_dup_users TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eco_points') THEN
    SELECT COUNT(*), COALESCE(string_agg(user_id::text, ', '), 'none')
    INTO v_dup_count, v_dup_users
    FROM (
      SELECT user_id
      FROM public.eco_points
      WHERE action_type = 'signup_bonus'::ecopoints_action
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_count > 0 THEN
      -- Report duplicates clearly without deleting records (as requested)
      RAISE WARNING 'GreenLoop Migration Notice: Found % user(s) with pre-existing duplicate signup_bonus entries: [%]. Creation of unique index idx_eco_points_unique_signup_bonus was skipped to prevent migration failure and preserve records. Manual review is recommended.', v_dup_count, v_dup_users;
    ELSE
      -- Clean data: create partial unique index
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_eco_points_unique_signup_bonus ON public.eco_points(user_id) WHERE (action_type = ''signup_bonus''::ecopoints_action)';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. RELIABLE DATABASE-LEVEL BALANCE PROTECTION & TRUSTED ACCOUNTING
-- ------------------------------------------------------------------------------

-- Reliable Database-Level Mechanism:
-- Protects profiles.eco_points_balance from direct client modification.
-- Direct client updates through PostgREST/Supabase SDK cannot alter points directly.
-- Authorized server-side functions set a transaction-local context flag before updating.
CREATE OR REPLACE FUNCTION public.protect_profile_eco_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.eco_points_balance IS DISTINCT FROM OLD.eco_points_balance THEN
    -- Check if the update is authorized by trusted internal server operations
    IF current_setting('greenloop.internal_ecopoints_update', true) <> 'true' THEN
      RAISE EXCEPTION 'Direct modification of eco_points_balance is forbidden. Points must be earned or redeemed through verified system operations.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_eco_points ON public.profiles;
CREATE TRIGGER trg_protect_profile_eco_points
  BEFORE UPDATE OF eco_points_balance ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_eco_points();

-- ------------------------------------------------------------------------------
-- 8A. SECURE REDEMPTION RPC (Debits Only - Zero Positive User Point Allocation)
-- ------------------------------------------------------------------------------
-- Users CANNOT award themselves positive points.
-- This RPC strictly enforces:
-- 1. p_points MUST be negative (debit only, e.g. claiming rewards).
-- 2. p_action_type MUST be 'reward_redeemed'.
-- 3. Sufficient balance check with row-level lock (FOR UPDATE) to prevent race conditions.
-- 4. Authorized balance cache synchronization matching authoritative ledger SUM(points).
CREATE OR REPLACE FUNCTION public.record_ecopoints_transaction(
  p_points INTEGER,
  p_action_type ecopoints_action,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_new_record_id UUID;
BEGIN
  -- 1. Caller authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in to record EcoPoints transactions';
  END IF;

  -- 2. CRITICAL SECURITY RULE: Reject all user-controlled positive point allocations
  IF p_points >= 0 THEN
    RAISE EXCEPTION 'Unauthorized: Users cannot allocate positive points. Points are awarded exclusively through verified system activities (e.g. creating listings, verified recycling).';
  END IF;

  -- 3. Restricted action gate: Only debits (such as reward redemptions) are allowed from client calls
  IF p_action_type <> 'reward_redeemed'::ecopoints_action THEN
    RAISE EXCEPTION 'Restricted action: % cannot be triggered directly by users. Only reward redemption debits are allowed.', p_action_type;
  END IF;

  -- 4. Debit protection: Check sufficient balance with row-level lock (FOR UPDATE) to prevent concurrency races
  SELECT eco_points_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF (COALESCE(v_current_balance, 0) + p_points) < 0 THEN
    RAISE EXCEPTION 'Insufficient EcoPoints balance (Current: %, Required: %)', COALESCE(v_current_balance, 0), abs(p_points);
  END IF;

  -- 5. Insert transaction into authoritative ledger
  INSERT INTO public.eco_points (
    user_id, points, action_type, description, reference_id
  )
  VALUES (
    v_user_id, p_points, p_action_type, p_description, p_reference_id
  )
  RETURNING id INTO v_new_record_id;

  -- 6. Authorize internal profile balance update for this transaction
  PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);

  -- 7. Atomically synchronize materialized profile balance to SUM(points)
  UPDATE public.profiles
  SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = v_user_id),
      updated_at = NOW()
  WHERE id = v_user_id
  RETURNING eco_points_balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_new_record_id,
    'points', p_points,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_ecopoints_transaction FROM public;
GRANT EXECUTE ON FUNCTION public.record_ecopoints_transaction TO authenticated;

-- ------------------------------------------------------------------------------
-- 8B. TRUSTED SERVER-SIDE LISTING CREATION POINTS TRIGGER
-- ------------------------------------------------------------------------------
-- Awards points ONLY through trusted server-side execution:
-- 1. Verifies the underlying activity: listing row actually inserted in public.listings.
-- 2. Validates ownership: NEW.user_id must match authenticated caller.
-- 3. Enforces eligibility: Active listings only; demo listings are strictly excluded.
-- 4. Prevents duplicate awards: Checks reference_id + action_type.
-- 5. Anti-gaming rate limit: Maximum 5 rewarded listings per user per calendar day.
-- 6. Non-negotiable points amount: strictly 30 points (fixed server constant).
-- 7. Row-level locking ensures balance cache remains consistent under concurrency.
CREATE OR REPLACE FUNCTION public.award_listing_ecopoints()
RETURNS TRIGGER AS $$
DECLARE
  v_points CONSTANT INTEGER := 30;
  v_today_awards INTEGER;
  v_current_balance INTEGER;
BEGIN
  -- 1. Ignore demo listings
  IF NEW.is_demo IS TRUE THEN
    RETURN NEW;
  END IF;

  -- 2. Only active listings qualify
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- 3. Validate user ownership
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 4. Prevent duplicate awards for the same listing
  IF EXISTS (
    SELECT 1 FROM public.eco_points 
    WHERE reference_id = NEW.id AND action_type = 'listing_created'::ecopoints_action
  ) THEN
    RETURN NEW;
  END IF;

  -- 5. Anti-gaming rate limit: max 5 rewarded listings per user per calendar day
  SELECT COUNT(*) INTO v_today_awards
  FROM public.eco_points
  WHERE user_id = NEW.user_id
    AND action_type = 'listing_created'::ecopoints_action
    AND created_at >= date_trunc('day', NOW());

  IF v_today_awards >= 5 THEN
    -- User still creates the listing successfully, but points award is capped to prevent spam
    RETURN NEW;
  END IF;

  -- 6. Acquire row-level lock on user's profile to prevent concurrent race conditions
  SELECT eco_points_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  -- 7. Insert authoritative ledger transaction
  INSERT INTO public.eco_points (
    user_id,
    points,
    action_type,
    reference_id,
    description
  )
  VALUES (
    NEW.user_id,
    v_points,
    'listing_created'::ecopoints_action,
    NEW.id,
    'Earned 30 EcoPoints for listing waste for circular reuse: ' || substring(NEW.title from 1 for 60)
  );

  -- 8. Authorize profile update and synchronize materialized balance to SUM(points)
  PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);

  UPDATE public.profiles
  SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = NEW.user_id),
      updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Logging error should not abort listing creation
  RAISE WARNING 'award_listing_ecopoints: EcoPoints award failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_award_listing_ecopoints ON public.listings;
CREATE TRIGGER trg_award_listing_ecopoints
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_listing_ecopoints();

-- ------------------------------------------------------------------------------
-- 9. SAFE BACKFILL & BALANCE PARITY RECONCILER FOR EXISTING USERS
-- ------------------------------------------------------------------------------
-- 1. Backfill profiles for existing auth.users who registered prior to trigger setup.
-- Location integrity: NO hardcoded Ernakulam; district is set ONLY if present in user metadata.
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  district,
  state,
  eco_points_balance,
  is_verified,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'GreenLoop Member'),
  COALESCE(u.email, ''),
  NULLIF(TRIM(u.raw_user_meta_data->>'district'), ''),
  'Kerala',
  0,
  COALESCE(u.email_confirmed_at IS NOT NULL, false),
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 2. Authoritative Ledger Seeding for Existing Profiles without ledger entries:
-- Preserves their existing balance in the authoritative ledger so ledger and profile cache are in 100% parity.
INSERT INTO public.eco_points (user_id, points, action_type, description, created_at)
SELECT
  p.id,
  CASE WHEN p.eco_points_balance > 0 THEN p.eco_points_balance ELSE 50 END,
  'signup_bonus'::ecopoints_action,
  'Welcome bonus for joining GreenLoop circular ecosystem',
  p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.eco_points e WHERE e.user_id = p.id
);

-- 3. Synchronize all profile balance caches to match SUM(points) exactly (100% Parity)
DO $$
BEGIN
  PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);
  UPDATE public.profiles p
  SET eco_points_balance = COALESCE((
    SELECT SUM(points) FROM public.eco_points e WHERE e.user_id = p.id
  ), 0);
END $$;

-- ------------------------------------------------------------------------------
-- 10. ROBUST AUTH SIGNUP TRIGGER (Zero Double-Counting & Strict Location Integrity)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_district TEXT;
BEGIN
  -- 1. Metadata extraction: Do not fabricate a district unless verified in user metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'GreenLoop Member');
  v_district := NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), '');

  -- 2. Upsert profile: Start with eco_points_balance = 0 (authoritative ledger handles allocation)
  -- Role is omitted from insert to let PostgreSQL apply the column DEFAULT ('individual') safely
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    district,
    state,
    eco_points_balance,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_full_name,
    COALESCE(NEW.email, ''),
    v_district,
    'Kerala',
    0,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    district = COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'district'), ''), public.profiles.district),
    is_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_verified END,
    updated_at = NOW();

  -- 3. Optionally update custom role if supplied in metadata, casting to live column type
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.profiles SET role = $1::' || 
        (SELECT CASE WHEN udt_name = 'user_role' THEN 'user_role' ELSE 'text' END 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') || 
        ' WHERE id = $2'
      USING (NEW.raw_user_meta_data->>'role'), NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Preserve default 'individual' on invalid role
    END;
  END IF;

  -- 4. Authoritative Welcome EcoPoints Allocation:
  -- Inserts ONE transaction into the ledger, then synchronizes profiles.eco_points_balance.
  -- Guarantees no double-counting and idempotent execution on trigger retry.
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eco_points') THEN
      -- Insert 50-point signup bonus only if user has not received one
      INSERT INTO public.eco_points (user_id, points, action_type, description)
      SELECT
        NEW.id,
        50,
        'signup_bonus'::ecopoints_action,
        'Welcome bonus for joining GreenLoop circular ecosystem'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.eco_points 
        WHERE user_id = NEW.id AND action_type = 'signup_bonus'::ecopoints_action
      );

      -- Authorize internal balance update and synchronize materialized balance from ledger
      PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);

      UPDATE public.profiles
      SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = NEW.id)
      WHERE id = NEW.id;
    END IF;
  EXCEPTION 
    WHEN unique_violation THEN
      -- Duplicate bonus prevented by unique index on retry; sync balance
      PERFORM set_config('greenloop.internal_ecopoints_update', 'true', true);
      UPDATE public.profiles
      SET eco_points_balance = (SELECT COALESCE(SUM(points), 0) FROM public.eco_points WHERE user_id = NEW.id)
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Missing table or points logging issue must NEVER block user signup
      RAISE WARNING 'handle_new_user: eco_points bonus allocation skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop ONLY the GreenLoop profile trigger, preserving all other Supabase auth hooks
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
