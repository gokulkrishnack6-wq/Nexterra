-- ==============================================================================
-- GREENLOOP KERALA WASTE DISCOVERY: QUERY OPTIMIZATION & DISTRICT INDEXES
-- Migration: 20261110060000_district_waste_discovery_query_optimization.sql
-- Description:
-- 1. Adds composite indexes on (district, municipality) and (district, location_type)
--    to optimize district-wide and municipality-level waste location queries.
-- 2. Adds composite partial index on listings (district, status) for fast active
--    marketplace discovery queries.
-- 3. Strictly non-destructive, idempotent, and preserves all existing production data.
-- ==============================================================================

-- 1. Composite indexes on public.waste_locations
CREATE INDEX IF NOT EXISTS idx_waste_locations_district_mun 
ON public.waste_locations (district, municipality);

CREATE INDEX IF NOT EXISTS idx_waste_locations_district_type 
ON public.waste_locations (district, location_type);

-- 2. Composite partial index on public.listings for active/reserved map listings
CREATE INDEX IF NOT EXISTS idx_listings_district_status 
ON public.listings (district, status) 
WHERE status IN ('active', 'reserved');

