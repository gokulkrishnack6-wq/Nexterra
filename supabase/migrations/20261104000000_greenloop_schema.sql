-- ==============================================================================
-- GREENLOOP DATABASE SCHEMA MIGRATION
-- Project: GREENLOOP — Waste Has a Second Life
-- Theme: Green Tomorrow – TERRACODE 2026 (MEA Engineering College)
-- Target: Supabase / PostgreSQL with Complete RLS, Triggers, & Functions
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'individual',
  'business',
  'farmer',
  'recycler',
  'ngo',
  'admin'
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'individual',
  organization_name TEXT,
  address TEXT,
  district TEXT NOT NULL DEFAULT 'Malappuram',
  state TEXT NOT NULL DEFAULT 'Kerala',
  latitude NUMERIC(10, 7) DEFAULT 11.0510,
  longitude NUMERIC(10, 7) DEFAULT 76.0711,
  avatar_url TEXT,
  bio TEXT,
  eco_points_balance INTEGER NOT NULL DEFAULT 100 CHECK (eco_points_balance >= 0),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching users and role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);

-- ------------------------------------------------------------------------------
-- 2. WASTE CATEGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waste_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL, -- Lucide icon identifier
  is_organic BOOLEAN NOT NULL DEFAULT false,
  recyclability_score INTEGER NOT NULL CHECK (recyclability_score BETWEEN 1 AND 100),
  standard_unit TEXT NOT NULL DEFAULT 'kg',
  default_co2_factor NUMERIC(6, 3) NOT NULL DEFAULT 1.25, -- kg CO2e saved per unit diverted
  default_landfill_factor NUMERIC(6, 3) NOT NULL DEFAULT 1.0, -- kg landfill avoided
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. LISTINGS
-- ------------------------------------------------------------------------------
CREATE TYPE listing_status AS ENUM (
  'active',
  'pending',
  'completed',
  'cancelled',
  'expired'
);

CREATE TYPE listing_pricing AS ENUM (
  'free',
  'exchange',
  'sale'
);

CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.waste_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) >= 5),
  description TEXT NOT NULL,
  material_type TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  listing_type listing_pricing NOT NULL DEFAULT 'free',
  price NUMERIC(10, 2) DEFAULT 0 CHECK (price >= 0),
  condition TEXT NOT NULL DEFAULT 'clean/dry',
  district TEXT NOT NULL DEFAULT 'Malappuram',
  locality TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 7) NOT NULL DEFAULT 11.0510,
  longitude NUMERIC(10, 7) NOT NULL DEFAULT 76.0711,
  status listing_status NOT NULL DEFAULT 'active',
  ai_classified BOOLEAN NOT NULL DEFAULT false,
  ai_confidence NUMERIC(5, 2) DEFAULT NULL,
  suggested_action TEXT,
  expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_district ON public.listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. LISTING IMAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON public.listing_images(listing_id);

-- ------------------------------------------------------------------------------
-- 5. EXCHANGE REQUESTS
-- ------------------------------------------------------------------------------
CREATE TYPE exchange_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'completed'
);

CREATE TABLE IF NOT EXISTS public.exchange_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_action TEXT NOT NULL, -- e.g. "Composting at farm", "Paper recycling"
  requested_quantity NUMERIC(10, 2) NOT NULL CHECK (requested_quantity > 0),
  message TEXT,
  status exchange_status NOT NULL DEFAULT 'pending',
  pickup_date TIMESTAMPTZ,
  completion_code TEXT DEFAULT upper(substring(md5(random()::text) from 1 for 6)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_requests_listing ON public.exchange_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_requester ON public.exchange_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON public.exchange_requests(status);

-- ------------------------------------------------------------------------------
-- 6. TRANSACTIONS (Verified completed exchanges)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  exchange_request_id UUID UNIQUE NOT NULL REFERENCES public.exchange_requests(id) ON DELETE RESTRICT,
  generator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.waste_categories(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  co2_saved_kg NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (co2_saved_kg >= 0),
  landfill_saved_kg NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (landfill_saved_kg >= 0),
  eco_points_awarded INTEGER NOT NULL DEFAULT 50 CHECK (eco_points_awarded >= 0),
  verified_by_recipient BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_generator ON public.transactions(generator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON public.transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_completed ON public.transactions(completed_at DESC);

-- ------------------------------------------------------------------------------
-- 7. FAVOURITES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favourites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_favourite UNIQUE (user_id, listing_id)
);

-- ------------------------------------------------------------------------------
-- 8. ECO POINTS LEDGER
-- ------------------------------------------------------------------------------
CREATE TYPE ecopoints_action AS ENUM (
  'signup_bonus',
  'listing_created',
  'exchange_completed',
  'challenge_completed',
  'verified_donation',
  'daily_streak',
  'referral'
);

CREATE TABLE IF NOT EXISTS public.eco_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points <> 0),
  action_type ecopoints_action NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eco_points_user ON public.eco_points(user_id);

-- ------------------------------------------------------------------------------
-- 9. SUSTAINABILITY FACTORS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sustainability_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.waste_categories(id) ON DELETE CASCADE,
  co2e_per_kg NUMERIC(6, 3) NOT NULL,
  methane_avoidance_per_kg NUMERIC(6, 3) NOT NULL DEFAULT 0.05,
  water_saved_liters_per_kg NUMERIC(8, 2) NOT NULL DEFAULT 10.0,
  source_reference TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. CHALLENGES
-- ------------------------------------------------------------------------------
CREATE TYPE challenge_status AS ENUM ('active', 'upcoming', 'completed');

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_kg NUMERIC(10, 2) NOT NULL,
  current_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.waste_categories(id) ON DELETE SET NULL,
  reward_points INTEGER NOT NULL DEFAULT 150,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  banner_url TEXT,
  district TEXT DEFAULT 'All Kerala',
  status challenge_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. CHALLENGE PARTICIPANTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_challenge_user UNIQUE (challenge_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 12. RECYCLING CENTRES
-- ------------------------------------------------------------------------------
CREATE TYPE operator_type AS ENUM (
  'haritha_karma_sena',
  'clean_kerala_company',
  'municipality_mcf',
  'private_recycler',
  'ngo_collection_hub'
);

CREATE TABLE IF NOT EXISTS public.recycling_centres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  operator_type operator_type NOT NULL DEFAULT 'haritha_karma_sena',
  district TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  accepted_categories TEXT[] NOT NULL DEFAULT ARRAY['Plastics', 'Paper', 'Glass', 'E-Waste'],
  operating_hours TEXT NOT NULL DEFAULT '9:00 AM - 5:00 PM (Mon-Sat)',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recycling_centres_district ON public.recycling_centres(district);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- ------------------------------------------------------------------------------
-- 14. AI SCAN HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  detected_material TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL,
  suggested_action TEXT NOT NULL,
  safety_guidance TEXT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_scan_history_user ON public.ai_scan_history(user_id);

-- ------------------------------------------------------------------------------
-- 15. REPORTS
-- ------------------------------------------------------------------------------
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_item_type TEXT NOT NULL CHECK (reported_item_type IN ('listing', 'user', 'centre')),
  reported_item_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 16. AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);

-- ==============================================================================
-- DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 1. Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, district)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Eco Pioneer'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'individual'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Malappuram')
  );

  -- Award Welcome EcoPoints
  INSERT INTO public.eco_points (user_id, points, action_type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Welcome bonus for joining GreenLoop circular ecosystem');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Award Points & Update Impact on Transaction Completion
CREATE OR REPLACE FUNCTION public.handle_completed_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_category waste_categories%ROWTYPE;
  v_points_generator INT := 50;
  v_points_recipient INT := 30;
BEGIN
  -- Mark listing as completed
  UPDATE public.listings
  SET status = 'completed', updated_at = NOW()
  WHERE id = NEW.listing_id;

  -- Mark exchange request as completed
  UPDATE public.exchange_requests
  SET status = 'completed', updated_at = NOW()
  WHERE id = NEW.exchange_request_id;

  -- Fetch category conversion factor
  SELECT * INTO v_category FROM public.waste_categories WHERE id = NEW.category_id;
  
  -- Calculate CO2e and landfill diversion
  NEW.co2_saved_kg := ROUND(NEW.quantity * COALESCE(v_category.default_co2_factor, 1.25), 2);
  NEW.landfill_saved_kg := ROUND(NEW.quantity * COALESCE(v_category.default_landfill_factor, 1.00), 2);
  NEW.eco_points_awarded := v_points_generator + v_points_recipient;

  -- Award points to Generator
  INSERT INTO public.eco_points (user_id, points, action_type, reference_id, description)
  VALUES (
    NEW.generator_id,
    v_points_generator,
    'exchange_completed',
    NEW.id,
    CONCAT('Diverted ', NEW.quantity, ' ', NEW.unit, ' of material through GreenLoop')
  );
  UPDATE public.profiles
  SET eco_points_balance = eco_points_balance + v_points_generator
  WHERE id = NEW.generator_id;

  -- Award points to Recipient
  INSERT INTO public.eco_points (user_id, points, action_type, reference_id, description)
  VALUES (
    NEW.recipient_id,
    v_points_recipient,
    'exchange_completed',
    NEW.id,
    CONCAT('Collected and repurposed ', NEW.quantity, ' ', NEW.unit, ' of material')
  );
  UPDATE public.profiles
  SET eco_points_balance = eco_points_balance + v_points_recipient
  WHERE id = NEW.recipient_id;

  -- Notify both users
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES
    (NEW.generator_id, 'Exchange Verified!', CONCAT('Your listing exchange was marked complete. You earned ', v_points_generator, ' EcoPoints!'), 'points', '/dashboard/impact'),
    (NEW.recipient_id, 'Collection Verified!', CONCAT('Thank you for completing the collection. You earned ', v_points_recipient, ' EcoPoints!'), 'points', '/dashboard/impact');

  -- Write to Audit Log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (NEW.generator_id, 'TRANSACTION_COMPLETED', 'transactions', NEW.id, row_to_json(NEW)::jsonb);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_inserted ON public.transactions;
CREATE TRIGGER on_transaction_inserted
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_completed_transaction();


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycling_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Anyone can view profiles; only owners can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Waste Categories: Read-only for all users; admin manages
CREATE POLICY "Categories viewable by everyone" ON public.waste_categories FOR SELECT USING (true);

-- 3. Listings: Active listings public; creators can insert, update, delete own
CREATE POLICY "Active listings viewable by everyone" ON public.listings FOR SELECT USING (status != 'cancelled' OR auth.uid() = user_id);
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- 4. Listing Images: Viewable by all; manageable by listing owner
CREATE POLICY "Images viewable by everyone" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Listing owner can insert images" ON public.listing_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

-- 5. Exchange Requests: Private between listing owner and requester
CREATE POLICY "Parties can view their exchange requests" ON public.exchange_requests FOR SELECT USING (
  auth.uid() = requester_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can submit requests" ON public.exchange_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Parties can update their exchange requests" ON public.exchange_requests FOR UPDATE USING (
  auth.uid() = requester_id OR 
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

-- 6. Transactions: Involved parties and admins can view
CREATE POLICY "Parties can view transactions" ON public.transactions FOR SELECT USING (
  auth.uid() = generator_id OR auth.uid() = recipient_id
);

-- 7. Favourites: Private to each user
CREATE POLICY "Users can view own favourites" ON public.favourites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favourites" ON public.favourites FOR ALL USING (auth.uid() = user_id);

-- 8. EcoPoints: Read-only for owner; server/triggers allocate
CREATE POLICY "Users view own points ledger" ON public.eco_points FOR SELECT USING (auth.uid() = user_id);

-- 9. Recycling Centres: Public viewable
CREATE POLICY "Recycling centres viewable by everyone" ON public.recycling_centres FOR SELECT USING (true);

-- 10. Challenges & Participants: Public viewable
CREATE POLICY "Challenges viewable by all" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Challenge participants viewable by all" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Notifications: Strictly private
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 12. AI Scan History: Private to user
CREATE POLICY "Users view own scans" ON public.ai_scan_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert scans" ON public.ai_scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. Reports: Reporter can view own reports
CREATE POLICY "Users can submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
