-- ==============================================================================
-- GREENLOOP SEED DATA
-- Context: Kerala Circular Economy & MEA Engineering College (Perinthalmanna)
-- ==============================================================================

-- 1. Waste Categories
INSERT INTO public.waste_categories (id, name, slug, description, icon, is_organic, recyclability_score, standard_unit, default_co2_factor, default_landfill_factor)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Organic & Kitchen Waste', 'organic', 'Vegetable peels, food leftovers, fruit residues, and market surplus suitable for composting or bio-gas.', 'Apple', true, 95, 'kg', 1.80, 1.20),
  ('c2222222-2222-2222-2222-222222222222', 'Coconut & Agricultural Residue', 'agricultural', 'Coconut husks, shells, fronds, banana stems, and paddy straw for mulch, coir, and biochar.', 'Trees', true, 90, 'kg', 1.50, 1.10),
  ('c3333333-3333-3333-3333-333333333333', 'Paper & Cardboard', 'paper', 'Corrugated boxes, newspapers, packaging cartons, and shredded office paper.', 'Scroll', false, 85, 'kg', 2.10, 1.30),
  ('c4444444-4444-4444-4444-444444444444', 'Plastics (Clean / Sorted)', 'plastics', 'HDPE bottles, PET containers, clean poly bags, plastic crates, and PP containers.', 'Package', false, 75, 'kg', 2.50, 1.05),
  ('c5555555-5555-5555-5555-555555555555', 'E-Waste & Electronics', 'e-waste', 'Old computers, broken chargers, lithium batteries, circuit boards, and appliances.', 'Cpu', false, 65, 'kg', 5.80, 0.95),
  ('c6666666-6666-6666-6666-666666666666', 'Metals & Aluminium Cans', 'metals', 'Tin scrap, iron rods, aluminium beverage cans, copper wiring, and metal hardware.', 'Wrench', false, 95, 'kg', 4.20, 1.00),
  ('c7777777-7777-7777-7777-777777777777', 'Glass Bottles & Jars', 'glass', 'Intact beer bottles, pickle jars, beverage glass, and broken cullet for re-melting.', 'Wine', false, 80, 'kg', 0.85, 1.15),
  ('c8888888-8888-8888-8888-888888888888', 'Textiles & Fabric Scraps', 'textiles', 'Cotton fabric trimmings, old cotton linen, tailoring leftovers for upcycling.', 'Shirt', false, 70, 'kg', 3.40, 1.10)
ON CONFLICT (id) DO NOTHING;

-- 2. Sustainability Factors
INSERT INTO public.sustainability_factors (category_id, co2e_per_kg, methane_avoidance_per_kg, water_saved_liters_per_kg, source_reference)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 1.800, 0.120, 15.00, 'Kerala State Pollution Control Board (KSPCB) / IPCC Waste Model'),
  ('c2222222-2222-2222-2222-222222222222', 1.500, 0.080, 8.50, 'Kerala Agricultural University (KAU) Biomass Conversion Studies'),
  ('c3333333-3333-3333-3333-333333333333', 2.100, 0.030, 26.00, 'Central Pollution Control Board (CPCB) Paper Recycling Guidelines'),
  ('c4444444-4444-4444-4444-444444444444', 2.500, 0.010, 18.00, 'Plastics Recyclers Association & Suchitwa Mission Kerala'),
  ('c5555555-5555-5555-5555-555555555555', 5.800, 0.005, 50.00, 'Clean Kerala Company E-Waste Resource Recovery Metrics'),
  ('c6666666-6666-6666-6666-666666666666', 4.200, 0.002, 35.00, 'Bureau of International Recycling (BIR) Metals Assessment'),
  ('c7777777-7777-7777-7777-777777777777', 0.850, 0.001, 5.00, 'European Container Glass Federation LCA Data'),
  ('c8888888-8888-8888-8888-888888888888', 3.400, 0.020, 120.00, 'Textile Exchange Global Recycled Standard')
ON CONFLICT (id) DO NOTHING;

-- 3. Recycling Centres & Haritha Karma Sena Collection Facilities in Kerala
INSERT INTO public.recycling_centres (id, name, operator_type, district, locality, address, latitude, longitude, phone, accepted_categories, operating_hours, rating)
VALUES
  (
    'r1111111-1111-1111-1111-111111111111',
    'Perinthalmanna Haritha Karma Sena Resource Recovery Facility',
    'haritha_karma_sena',
    'Malappuram',
    'Perinthalmanna',
    'Near MEA Engineering College Junction, Perinthalmanna, Malappuram - 679322',
    10.9760,
    76.2254,
    '+91 4933 227245',
    ARRAY['Plastics', 'Paper & Cardboard', 'Glass', 'E-Waste', 'Textiles'],
    '8:30 AM - 5:00 PM (Mon-Sat)',
    4.9
  ),
  (
    'r2222222-2222-2222-2222-222222222222',
    'Clean Kerala Company Regional Collection Hub',
    'clean_kerala_company',
    'Malappuram',
    'Manjeri',
    'Industrial Estate, Karuvambram, Manjeri, Malappuram - 676123',
    11.1200,
    76.1205,
    '+91 4832 764411',
    ARRAY['Plastics', 'E-Waste', 'Metals', 'Paper & Cardboard'],
    '9:00 AM - 5:30 PM (Mon-Fri)',
    4.8
  ),
  (
    'r3333333-3333-3333-3333-333333333333',
    'Kozhikode Corporation Material Collection Facility (MCF)',
    'municipality_mcf',
    'Kozhikode',
    'Mavoor Road',
    'Near KSRTC Bus Terminal, Mavoor Road, Kozhikode - 673001',
    11.2588,
    75.7804,
    '+91 4952 721526',
    ARRAY['Plastics', 'Paper & Cardboard', 'Glass', 'Textiles'],
    '8:00 AM - 6:00 PM (Daily)',
    4.7
  ),
  (
    'r4444444-4444-4444-4444-444444444444',
    'Ernakulam Green Action E-Waste & Plastic Hub',
    'private_recycler',
    'Ernakulam',
    'Kalamassery',
    'HMT Junction, Kalamassery, Kochi - 683104',
    10.0469,
    76.3262,
    '+91 4842 555890',
    ARRAY['E-Waste', 'Plastics', 'Metals'],
    '9:00 AM - 6:00 PM (Mon-Sat)',
    4.9
  ),
  (
    'r5555555-5555-5555-5555-555555555555',
    'Palakkad Agro-Waste & Coir Processing Cluster',
    'ngo_collection_hub',
    'Palakkad',
    'Ottapalam',
    'Main Road, Near Railway Station, Ottapalam, Palakkad - 679101',
    10.7719,
    76.3814,
    '+91 4912 443210',
    ARRAY['Coconut & Agricultural Residue', 'Organic & Kitchen Waste'],
    '7:30 AM - 4:30 PM (Mon-Sat)',
    4.8
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Challenges
INSERT INTO public.challenges (id, title, description, target_kg, current_kg, reward_points, start_date, end_date, banner_url, district, status)
VALUES
  (
    'ch111111-1111-1111-1111-111111111111',
    'Malabar Zero-Waste Restaurant Drive',
    'Divert 500 kg of vegetable scraps and coffee grounds to local organic community gardens and biogas units across Malappuram & Kozhikode.',
    500.00,
    312.50,
    250,
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '23 days',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    'Malappuram',
    'active'
  ),
  (
    'ch222222-2222-2222-2222-222222222222',
    'Campus E-Waste Circular Recovery @ MEA',
    'Collect obsolete electronics, cords, chargers, and dead batteries to ensure safe smelting and extraction by Clean Kerala Company.',
    200.00,
    145.00,
    300,
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '14 days',
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80',
    'All Kerala',
    'active'
  ),
  (
    'ch333333-3333-3333-3333-333333333333',
    'Coconut Husk Biochar & Mulch Initiative',
    'Connect tender coconut vendors with organic farmers to convert 1,000 kg of discarded coconut shells into soil nutrients.',
    1000.00,
    680.00,
    400,
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days',
    'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1200&q=80',
    'Palakkad',
    'active'
  )
ON CONFLICT (id) DO NOTHING;
