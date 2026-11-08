-- ==============================================================================
-- GREENLOOP (NEXTERRA) FORWARD MIGRATION: LOCATION-BASED LISTING & DISCOVERY
-- File: supabase/migrations/20261108010000_listings_location_enhancements.sql
-- Status: PREPARED FOR REVIEW (DO NOT EXECUTE WITHOUT USER CONFIRMATION)
-- Non-destructive, purely additive schema update for public.listings
-- ==============================================================================

DO $$
BEGIN
  -- 1. Add city column to public.listings if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'listings' 
      AND column_name = 'city'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN city TEXT;
  END IF;

  -- 2. Add state column to public.listings if not exists (default 'Kerala')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'listings' 
      AND column_name = 'state'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN state TEXT DEFAULT 'Kerala';
  END IF;

  -- 3. Add pincode column to public.listings if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'listings' 
      AND column_name = 'pincode'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN pincode TEXT;
  END IF;

  -- 4. Add formatted_address column to public.listings if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'listings' 
      AND column_name = 'formatted_address'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN formatted_address TEXT;
    
    -- Gracefully backfill formatted_address from existing address column where available
    UPDATE public.listings 
    SET formatted_address = address 
    WHERE formatted_address IS NULL AND address IS NOT NULL;
  END IF;
END $$;

-- Spatial search indexes for high-speed nearby discovery and district filtering
CREATE INDEX IF NOT EXISTS idx_listings_lat_long ON public.listings (latitude, longitude) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_district_active ON public.listings (district) 
WHERE status = 'active';

COMMENT ON COLUMN public.listings.formatted_address IS 'Full readable address or landmark captured during listing creation';
COMMENT ON COLUMN public.listings.locality IS 'Locality, town, or village name for approximate privacy-preserving display';
COMMENT ON COLUMN public.listings.district IS 'Kerala revenue district';
COMMENT ON COLUMN public.listings.city IS 'City, municipality, or local revenue body';
COMMENT ON COLUMN public.listings.state IS 'State name (default Kerala)';
COMMENT ON COLUMN public.listings.pincode IS 'Postal PIN code (optional)';

