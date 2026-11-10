-- ==============================================================================
-- GreenLoop — Kerala-Wide Waste Location Network Expansion & Hardening
-- Migration: 20261110050000_kerala_waste_network_expansion.sql
-- ==============================================================================

-- 1. Extend waste_locations table with photo_url and source_information columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'waste_locations' 
      AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.waste_locations ADD COLUMN photo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'waste_locations' 
      AND column_name = 'source_information'
  ) THEN
    ALTER TABLE public.waste_locations ADD COLUMN source_information TEXT;
  END IF;
END $$;

-- 2. Restore and persist legacy public waste bins into waste_locations
INSERT INTO public.waste_locations (
  name, location_type, facility_type, accepted_waste_categories,
  description, address, district, municipality, pincode,
  latitude, longitude, opening_hours, source, source_reference,
  verification_status
) VALUES
  (
    'Marine Drive Segregated Bio-Bin Hub',
    'public_bin',
    'segregated_smart_bin',
    ARRAY['Organic / Wet Waste', 'Biodegradable Food Waste'],
    'Marine Drive waterfront segregated bio-bin hub managed by Kochi Municipal Corporation.',
    'Near Rainbow Bridge Promenade, Marine Drive, Kochi, Ernakulam, Kerala - 682031',
    'Ernakulam',
    'Kochi',
    '682031',
    9.9816,
    76.2750,
    '24/7 (Public Access)',
    'lsgd_kerala',
    'KMC-BIN-001',
    'officially_verified'
  ),
  (
    'Panampilly Nagar Smart Plastic Flaking Kiosk',
    'public_bin',
    'segregated_smart_bin',
    ARRAY['Plastics', 'Clean PET Bottles'],
    'Smart plastic bottle collection kiosk at Central Park entrance, Ward 24.',
    'Central Park Entrance, Ward 24, Panampilly Nagar, Kochi, Ernakulam, Kerala - 682036',
    'Ernakulam',
    'Kochi',
    '682036',
    9.9610,
    76.2950,
    '06:00 - 21:00',
    'suchitwa_mission',
    'SM-BIN-002',
    'officially_verified'
  ),
  (
    'Kadavanthra Junction E-Waste Drop Box',
    'public_bin',
    'e_waste_kiosk',
    ARRAY['E-Waste', 'Batteries & Accs', 'Small Electronics'],
    'Metro station entry electronic waste drop box managed by Clean Kerala Company.',
    'Metro Station Entry B, Kadavanthra, Kochi, Ernakulam, Kerala - 682020',
    'Ernakulam',
    'Kochi',
    '682020',
    9.9675,
    76.2995,
    '06:00 - 22:30',
    'clean_kerala_company',
    'CKC-BIN-003',
    'officially_verified'
  ),
  (
    'Perinthalmanna Town Square Segregated Smart Kiosk',
    'public_bin',
    'segregated_smart_bin',
    ARRAY['Plastics', 'Paper', 'Metals'],
    'Town square public segregated smart bin kiosk opposite Municipal Town Hall.',
    'Opposite Municipal Town Hall, Perinthalmanna, Malappuram, Kerala - 679322',
    'Malappuram',
    'Perinthalmanna',
    '679322',
    10.9760,
    76.2254,
    '24/7 (Public Access)',
    'lsgd_kerala',
    'PTM-BIN-004',
    'officially_verified'
  ),
  (
    'Manaveeyam Veedhi Solar Bio-Composter Bin',
    'public_bin',
    'segregated_smart_bin',
    ARRAY['Organic / Wet Waste', 'Garden Waste'],
    'Solar-powered aerobic bio-composter bin at Manaveeyam Cultural Corridor.',
    'Manaveeyam Cultural Corridor, Vellayambalam, Thiruvananthapuram, Kerala - 695033',
    'Thiruvananthapuram',
    'Thiruvananthapuram',
    '695033',
    8.5100,
    76.9550,
    '24/7 (Public Access)',
    'suchitwa_mission',
    'SM-BIN-005',
    'officially_verified'
  )
ON CONFLICT (source, source_reference) WHERE source_reference IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

-- 3. Strict RLS Policies for Community Submissions & Moderation Security
ALTER TABLE public.waste_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read verified waste locations" ON public.waste_locations;
CREATE POLICY "Public read verified waste locations"
ON public.waste_locations FOR SELECT
USING (
  verification_status IN ('officially_verified', 'community_verified', 'community_reported', 'unverified')
  OR (auth.uid() IS NOT NULL AND auth.uid() = submitted_by)
);

DROP POLICY IF EXISTS "Authenticated users can submit waste locations" ON public.waste_locations;
CREATE POLICY "Authenticated users can submit waste locations"
ON public.waste_locations FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (submitted_by = auth.uid() OR submitted_by IS NULL)
  AND verification_status IN ('pending_verification', 'community_reported')
);

DROP POLICY IF EXISTS "Users can update own pending submissions" ON public.waste_locations;
CREATE POLICY "Users can update own pending submissions"
ON public.waste_locations FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = submitted_by 
  AND verification_status = 'pending_verification'
)
WITH CHECK (
  verification_status = 'pending_verification'
);
