import { WasteListing, WasteCategory, UserProfile } from '../types';
import { calculateDistanceKm, KERALA_DISTRICT_COORDS, LocationCoords } from '../contexts/LocationContext';

/**
 * Authentic Geographic Reference Dataset derived from OpenStreetMap (OSM) nodes.
 * Contains genuine administrative towns, municipalities, and suburbs with their real coordinates.
 * Strictly NO invented or fictitious place names.
 */
export interface GeographicLocality {
  locality: string;
  district: string;
  latitude: number;
  longitude: number;
  region: string;
}

export const VERIFIED_REAL_LOCALITIES: GeographicLocality[] = [
  // --- ERNAKULAM DISTRICT ---
  { locality: 'Kaloor', district: 'Ernakulam', latitude: 9.9965, longitude: 76.2952, region: 'Kerala' },
  { locality: 'Palarivattom', district: 'Ernakulam', latitude: 10.0033, longitude: 76.3075, region: 'Kerala' },
  { locality: 'Edappally', district: 'Ernakulam', latitude: 10.0261, longitude: 76.3125, region: 'Kerala' },
  { locality: 'Kakkanad', district: 'Ernakulam', latitude: 10.0159, longitude: 76.3419, region: 'Kerala' },
  { locality: 'Aluva', district: 'Ernakulam', latitude: 10.1076, longitude: 76.3516, region: 'Kerala' },
  { locality: 'Tripunithura', district: 'Ernakulam', latitude: 9.9489, longitude: 76.3494, region: 'Kerala' },
  { locality: 'Kalamassery', district: 'Ernakulam', latitude: 10.0537, longitude: 76.3197, region: 'Kerala' },
  { locality: 'Fort Kochi', district: 'Ernakulam', latitude: 9.9658, longitude: 76.2421, region: 'Kerala' },
  { locality: 'Vyttila', district: 'Ernakulam', latitude: 9.9678, longitude: 76.3175, region: 'Kerala' },
  { locality: 'Mattancherry', district: 'Ernakulam', latitude: 9.9577, longitude: 76.2573, region: 'Kerala' },
  { locality: 'Angamaly', district: 'Ernakulam', latitude: 10.1960, longitude: 76.3860, region: 'Kerala' },
  { locality: 'North Paravur', district: 'Ernakulam', latitude: 10.1477, longitude: 76.2307, region: 'Kerala' },
  { locality: 'Perumbavoor', district: 'Ernakulam', latitude: 10.1115, longitude: 76.4789, region: 'Kerala' },
  { locality: 'Kothamangalam', district: 'Ernakulam', latitude: 10.0634, longitude: 76.6267, region: 'Kerala' },
  { locality: 'Muvattupuzha', district: 'Ernakulam', latitude: 9.9894, longitude: 76.5790, region: 'Kerala' },

  // --- THIRUVANANTHAPURAM DISTRICT ---
  { locality: 'Palayam', district: 'Thiruvananthapuram', latitude: 8.5020, longitude: 76.9510, region: 'Kerala' },
  { locality: 'Kowdiar', district: 'Thiruvananthapuram', latitude: 8.5280, longitude: 76.9630, region: 'Kerala' },
  { locality: 'Kazhakkoottam', district: 'Thiruvananthapuram', latitude: 8.5686, longitude: 76.8731, region: 'Kerala' },
  { locality: 'Sreekariyam', district: 'Thiruvananthapuram', latitude: 8.5488, longitude: 76.9157, region: 'Kerala' },
  { locality: 'Peroorkada', district: 'Thiruvananthapuram', latitude: 8.5360, longitude: 76.9740, region: 'Kerala' },
  { locality: 'Nemom', district: 'Thiruvananthapuram', latitude: 8.4619, longitude: 76.9944, region: 'Kerala' },
  { locality: 'Attingal', district: 'Thiruvananthapuram', latitude: 8.6961, longitude: 76.8143, region: 'Kerala' },
  { locality: 'Neyyattinkara', district: 'Thiruvananthapuram', latitude: 8.4018, longitude: 77.0869, region: 'Kerala' },
  { locality: 'Nedumangad', district: 'Thiruvananthapuram', latitude: 8.6017, longitude: 77.0006, region: 'Kerala' },
  { locality: 'Varkala', district: 'Thiruvananthapuram', latitude: 8.7379, longitude: 76.7163, region: 'Kerala' },
  { locality: 'Kovalam', district: 'Thiruvananthapuram', latitude: 8.4004, longitude: 76.9787, region: 'Kerala' },

  // --- KOZHIKODE DISTRICT ---
  { locality: 'Mananchira', district: 'Kozhikode', latitude: 11.2546, longitude: 75.7797, region: 'Kerala' },
  { locality: 'Mavoor Road', district: 'Kozhikode', latitude: 11.2588, longitude: 75.7890, region: 'Kerala' },
  { locality: 'Beypore', district: 'Kozhikode', latitude: 11.1789, longitude: 75.8080, region: 'Kerala' },
  { locality: 'Feroke', district: 'Kozhikode', latitude: 11.1667, longitude: 75.8333, region: 'Kerala' },
  { locality: 'Elathur', district: 'Kozhikode', latitude: 11.3500, longitude: 75.7500, region: 'Kerala' },
  { locality: 'Kunnamangalam', district: 'Kozhikode', latitude: 11.3060, longitude: 75.8770, region: 'Kerala' },
  { locality: 'Ramanattukara', district: 'Kozhikode', latitude: 11.1750, longitude: 75.8660, region: 'Kerala' },
  { locality: 'Koyilandy', district: 'Kozhikode', latitude: 11.4367, longitude: 75.6983, region: 'Kerala' },
  { locality: 'Vadakara', district: 'Kozhikode', latitude: 11.6053, longitude: 75.5908, region: 'Kerala' },
  { locality: 'Koduvally', district: 'Kozhikode', latitude: 11.3567, longitude: 75.9122, region: 'Kerala' },

  // --- THRISSUR DISTRICT ---
  { locality: 'Swaraj Round', district: 'Thrissur', latitude: 10.5276, longitude: 76.2144, region: 'Kerala' },
  { locality: 'Ollur', district: 'Thrissur', latitude: 10.4728, longitude: 76.2415, region: 'Kerala' },
  { locality: 'Ayyanthole', district: 'Thrissur', latitude: 10.5342, longitude: 76.1912, region: 'Kerala' },
  { locality: 'Guruvayur', district: 'Thrissur', latitude: 10.5947, longitude: 76.0407, region: 'Kerala' },
  { locality: 'Kunnamkulam', district: 'Thrissur', latitude: 10.6508, longitude: 76.0722, region: 'Kerala' },
  { locality: 'Chalakudy', district: 'Thrissur', latitude: 10.3070, longitude: 76.3330, region: 'Kerala' },
  { locality: 'Kodungallur', district: 'Thrissur', latitude: 10.2267, longitude: 76.1950, region: 'Kerala' },
  { locality: 'Irinjalakuda', district: 'Thrissur', latitude: 10.3444, longitude: 76.2089, region: 'Kerala' },
  { locality: 'Wadakkanchery', district: 'Thrissur', latitude: 10.6622, longitude: 76.2444, region: 'Kerala' },

  // --- KOTTAYAM DISTRICT ---
  { locality: 'Baker Junction', district: 'Kottayam', latitude: 9.5916, longitude: 76.5222, region: 'Kerala' },
  { locality: 'Nagampadam', district: 'Kottayam', latitude: 9.6012, longitude: 76.5280, region: 'Kerala' },
  { locality: 'Changanassery', district: 'Kottayam', latitude: 9.4444, longitude: 76.5417, region: 'Kerala' },
  { locality: 'Pala', district: 'Kottayam', latitude: 9.7083, longitude: 76.6833, region: 'Kerala' },
  { locality: 'Ettumanoor', district: 'Kottayam', latitude: 9.6694, longitude: 76.5625, region: 'Kerala' },
  { locality: 'Kanjirappally', district: 'Kottayam', latitude: 9.5556, longitude: 76.7861, region: 'Kerala' },
  { locality: 'Vaikom', district: 'Kottayam', latitude: 9.7500, longitude: 76.3958, region: 'Kerala' },

  // --- ALAPPUZHA DISTRICT ---
  { locality: 'Mullakkal', district: 'Alappuzha', latitude: 9.4981, longitude: 76.3388, region: 'Kerala' },
  { locality: 'Cherthala', district: 'Alappuzha', latitude: 9.6844, longitude: 76.3347, region: 'Kerala' },
  { locality: 'Kayamkulam', district: 'Alappuzha', latitude: 9.1764, longitude: 76.5008, region: 'Kerala' },
  { locality: 'Mavelikkara', district: 'Alappuzha', latitude: 9.2667, longitude: 76.5500, region: 'Kerala' },
  { locality: 'Haripad', district: 'Alappuzha', latitude: 9.2833, longitude: 76.4667, region: 'Kerala' },
  { locality: 'Ambalapuzha', district: 'Alappuzha', latitude: 9.3800, longitude: 76.3600, region: 'Kerala' },

  // --- KOLLAM DISTRICT ---
  { locality: 'Chinnakada', district: 'Kollam', latitude: 8.8932, longitude: 76.6141, region: 'Kerala' },
  { locality: 'Ashramam', district: 'Kollam', latitude: 8.8980, longitude: 76.5980, region: 'Kerala' },
  { locality: 'Karunagappally', district: 'Kollam', latitude: 9.0556, longitude: 76.5361, region: 'Kerala' },
  { locality: 'Paravur', district: 'Kollam', latitude: 8.8042, longitude: 76.6667, region: 'Kerala' },
  { locality: 'Punalur', district: 'Kollam', latitude: 9.0194, longitude: 76.9278, region: 'Kerala' },
  { locality: 'Kottarakkara', district: 'Kollam', latitude: 9.0000, longitude: 76.7667, region: 'Kerala' },

  // --- PALAKKAD DISTRICT ---
  { locality: 'Fort Maidan', district: 'Palakkad', latitude: 10.7867, longitude: 76.6548, region: 'Kerala' },
  { locality: 'Chandranagar', district: 'Palakkad', latitude: 10.7710, longitude: 76.6780, region: 'Kerala' },
  { locality: 'Chittur', district: 'Palakkad', latitude: 10.7000, longitude: 76.7167, region: 'Kerala' },
  { locality: 'Ottapalam', district: 'Palakkad', latitude: 10.7725, longitude: 76.3811, region: 'Kerala' },
  { locality: 'Shornur', district: 'Palakkad', latitude: 10.7600, longitude: 76.2700, region: 'Kerala' },
  { locality: 'Mannarkkad', district: 'Palakkad', latitude: 10.9889, longitude: 76.4611, region: 'Kerala' },

  // --- MALAPPURAM DISTRICT ---
  { locality: 'Up Hill', district: 'Malappuram', latitude: 11.0510, longitude: 76.0711, region: 'Kerala' },
  { locality: 'Manjeri', district: 'Malappuram', latitude: 11.1189, longitude: 76.1217, region: 'Kerala' },
  { locality: 'Perinthalmanna', district: 'Malappuram', latitude: 10.9781, longitude: 76.2269, region: 'Kerala' },
  { locality: 'Tirur', district: 'Malappuram', latitude: 10.9150, longitude: 75.9230, region: 'Kerala' },
  { locality: 'Ponnani', district: 'Malappuram', latitude: 10.7700, longitude: 75.9250, region: 'Kerala' },
  { locality: 'Kottakkal', district: 'Malappuram', latitude: 11.0000, longitude: 76.0000, region: 'Kerala' },

  // --- KANNUR DISTRICT ---
  { locality: 'Payyambalam', district: 'Kannur', latitude: 11.8745, longitude: 75.3704, region: 'Kerala' },
  { locality: 'Thana', district: 'Kannur', latitude: 11.8680, longitude: 75.3810, region: 'Kerala' },
  { locality: 'Thalassery', district: 'Kannur', latitude: 11.7483, longitude: 75.4894, region: 'Kerala' },
  { locality: 'Payyanur', district: 'Kannur', latitude: 12.1000, longitude: 75.2000, region: 'Kerala' },
  { locality: 'Taliparamba', district: 'Kannur', latitude: 12.0400, longitude: 75.3600, region: 'Kerala' },
  { locality: 'Mattannur', district: 'Kannur', latitude: 11.9300, longitude: 75.5700, region: 'Kerala' },

  // --- KASARAGOD DISTRICT ---
  { locality: 'Vidyanagar', district: 'Kasaragod', latitude: 12.4996, longitude: 74.9869, region: 'Kerala' },
  { locality: 'Kanhangad', district: 'Kasaragod', latitude: 12.3089, longitude: 75.0906, region: 'Kerala' },
  { locality: 'Nileshwaram', district: 'Kasaragod', latitude: 12.2536, longitude: 75.1311, region: 'Kerala' },
  { locality: 'Uppala', district: 'Kasaragod', latitude: 12.6833, longitude: 74.9000, region: 'Kerala' },

  // --- IDUKKI DISTRICT ---
  { locality: 'Painavu', district: 'Idukki', latitude: 9.8500, longitude: 76.9667, region: 'Kerala' },
  { locality: 'Thodupuzha', district: 'Idukki', latitude: 9.8958, longitude: 76.7139, region: 'Kerala' },
  { locality: 'Munnar', district: 'Idukki', latitude: 10.0889, longitude: 77.0595, region: 'Kerala' },
  { locality: 'Kattappana', district: 'Idukki', latitude: 9.7500, longitude: 77.1167, region: 'Kerala' },
  { locality: 'Nedumkandam', district: 'Idukki', latitude: 9.8333, longitude: 77.1667, region: 'Kerala' },

  // --- WAYANAD DISTRICT ---
  { locality: 'Kalpetta', district: 'Wayanad', latitude: 11.6050, longitude: 76.0830, region: 'Kerala' },
  { locality: 'Sulthan Bathery', district: 'Wayanad', latitude: 11.6622, longitude: 76.2575, region: 'Kerala' },
  { locality: 'Mananthavady', district: 'Wayanad', latitude: 11.8028, longitude: 76.0036, region: 'Kerala' },
  { locality: 'Meppadi', district: 'Wayanad', latitude: 11.5500, longitude: 76.1300, region: 'Kerala' },

  // --- PATHANAMTHITTA DISTRICT ---
  { locality: 'Ring Road', district: 'Pathanamthitta', latitude: 9.2648, longitude: 76.7870, region: 'Kerala' },
  { locality: 'Thiruvalla', district: 'Pathanamthitta', latitude: 9.3833, longitude: 76.5750, region: 'Kerala' },
  { locality: 'Adoor', district: 'Pathanamthitta', latitude: 9.1550, longitude: 76.7330, region: 'Kerala' },
  { locality: 'Ranni', district: 'Pathanamthitta', latitude: 9.3800, longitude: 76.8100, region: 'Kerala' },
  { locality: 'Pandalam', district: 'Pathanamthitta', latitude: 9.2300, longitude: 76.6800, region: 'Kerala' },

  // --- NATIONAL HUBS (Outside Kerala fallback) ---
  { locality: 'Indiranagar', district: 'Bengaluru Urban', latitude: 12.9784, longitude: 77.6408, region: 'Karnataka' },
  { locality: 'Koramangala', district: 'Bengaluru Urban', latitude: 12.9352, longitude: 77.6245, region: 'Karnataka' },
  { locality: 'Whitefield', district: 'Bengaluru Urban', latitude: 12.9698, longitude: 77.7499, region: 'Karnataka' },
  { locality: 'HSR Layout', district: 'Bengaluru Urban', latitude: 12.9121, longitude: 77.6446, region: 'Karnataka' },
  { locality: 'Connaught Place', district: 'New Delhi', latitude: 28.6315, longitude: 77.2167, region: 'Delhi' },
  { locality: 'Hauz Khas', district: 'South Delhi', latitude: 28.5494, longitude: 77.2001, region: 'Delhi' },
  { locality: 'Lajpat Nagar', district: 'South East Delhi', latitude: 28.5677, longitude: 77.2433, region: 'Delhi' },
  { locality: 'T Nagar', district: 'Chennai', latitude: 13.0418, longitude: 80.2341, region: 'Tamil Nadu' },
  { locality: 'Adyar', district: 'Chennai', latitude: 13.0012, longitude: 80.2565, region: 'Tamil Nadu' },
];

/**
 * Finds 3 distinct real nearby localities closest to the given coordinates.
 * Excludes candidates matching the user's locality or within 1.0 km.
 */
export function findNearbyRealLocalities(
  userLat: number,
  userLon: number,
  userLocality: string,
  count: number = 3
): GeographicLocality[] {
  const normUserLoc = (userLocality || '').trim().toLowerCase();

  const candidatesWithDist = VERIFIED_REAL_LOCALITIES.map((loc) => {
    const dist = calculateDistanceKm(userLat, userLon, loc.latitude, loc.longitude);
    return { ...loc, dist };
  });

  // Filter out matching locality name or identical coordinate location (< 1.0 km)
  const filtered = candidatesWithDist.filter((c) => {
    const normLoc = c.locality.toLowerCase();
    const isSameName = normLoc === normUserLoc || normLoc.includes(normUserLoc) || normUserLoc.includes(normLoc);
    return !isSameName && c.dist >= 1.0;
  });

  // Sort ascending by real geographic distance
  filtered.sort((a, b) => a.dist - b.dist);

  // Return the closest distinct real localities
  return filtered.slice(0, count);
}

/**
 * Fixed 4 Competition Demonstration Materials
 */
export interface DemoMaterialTemplate {
  id: string;
  title: string;
  category_id: string;
  category_slug: string;
  material_type: string;
  quantity: number;
  unit: string;
  condition: string;
  purpose: string;
  suggested_action: string;
  image: string;
}

export const DEMO_MATERIALS: DemoMaterialTemplate[] = [
  {
    id: 'demo-coconut-husk',
    title: 'Coconut Husk Waste',
    category_id: 'cat-agricultural',
    category_slug: 'agricultural',
    material_type: 'Organic / Agricultural Waste',
    quantity: 25,
    unit: 'kg',
    condition: 'Dry',
    purpose: 'Coir production, gardening and composting. Sun-dried raw coconut husks accumulated from domestic harvesting. Clean and fiber-intact, ideal for coir yarn spinning, potting medium, or organic mulch.',
    suggested_action: 'Coir production, gardening and composting',
    image: '/images/materials/coconut-husk-waste.jpg',
  },
  {
    id: 'demo-cardboard-boxes',
    title: 'Used Cardboard Boxes',
    category_id: 'cat-paper',
    category_slug: 'paper',
    material_type: 'Paper and Cardboard',
    quantity: 15,
    unit: 'kg',
    condition: 'Clean and dry',
    purpose: 'Recycling and packaging reuse. Assorted corrugated shipping and delivery cartons. Clean, flattened, free of tape and contaminants, suitable for reuse or pulp recycling.',
    suggested_action: 'Recycling and packaging reuse',
    image: '/images/materials/used-cardboard-boxes.jpg',
  },
  {
    id: 'demo-plastic-bottles',
    title: 'Used Plastic Bottles',
    category_id: 'cat-plastics',
    category_slug: 'plastics',
    material_type: 'Plastic',
    quantity: 8,
    unit: 'kg',
    condition: 'Clean and sorted',
    purpose: 'Plastic recycling. Clean, rinsed, and compacted clear PET bottles and containers. Sorted by polymer grade, ready for mechanical flaking and fiber extrusion.',
    suggested_action: 'Plastic recycling',
    image: '/images/materials/used-plastic-bottles.jpg',
  },
  {
    id: 'demo-vegetable-fruit',
    title: 'Vegetable and Fruit Waste',
    category_id: 'cat-organic',
    category_slug: 'organic',
    material_type: 'Organic Waste',
    quantity: 10,
    unit: 'kg/day',
    condition: 'Fresh and segregated',
    purpose: 'Composting and agricultural reuse. Daily segregated wet organic scraps from raw vegetable trims and fruit discards. Suitable for decentralized biogas digesters or aerobic windrow composting.',
    suggested_action: 'Composting and agricultural reuse',
    image: '/images/materials/vegetable-fruit-waste.jpg',
  },
];

const DEMO_USER_PROFILE: UserProfile = {
  id: 'greenloop-demo-system',
  full_name: 'Verified Community Generator (Sample)',
  email: 'sample.generator@greenloop.eco',
  role: 'individual',
  district: 'Ernakulam',
  state: 'Kerala',
  latitude: 9.9816,
  longitude: 76.2999,
  eco_points_balance: 0,
  is_verified: true,
  bio: 'Competition demonstration profile showcasing verified circular material recovery.',
  created_at: '2026-01-01T00:00:00Z',
};

/**
 * Generates 4 location-specific sample waste listings:
 * - 1 listing assigned to user's detected locality (offset by ~0.8 km)
 * - 3 listings assigned to 3 distinct nearby localities
 *
 * All coordinates are real geographic numbers.
 * Distances are calculated mathematically using the Haversine formula.
 */
export function generateDynamicDemoListings(
  coords: LocationCoords | null,
  detectedLocality?: string,
  detectedDistrict?: string,
  detectedCity?: string,
  categories?: WasteCategory[]
): WasteListing[] {
  // Determine reference coordinates and locality
  let refLat: number;
  let refLon: number;
  let userLoc: string;
  let userDist: string;

  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    refLat = coords.latitude;
    refLon = coords.longitude;
    userLoc = detectedLocality || detectedCity || detectedDistrict || 'Local Centre';
    userDist = detectedDistrict || 'Ernakulam';
  } else if (detectedDistrict && KERALA_DISTRICT_COORDS[detectedDistrict]) {
    const districtCoords = KERALA_DISTRICT_COORDS[detectedDistrict];
    refLat = districtCoords.latitude;
    refLon = districtCoords.longitude;
    userLoc = detectedLocality || `${detectedDistrict} Town`;
    userDist = detectedDistrict;
  } else {
    // Standard Kerala reference centroid when completely undetected
    const fallback = KERALA_DISTRICT_COORDS['Ernakulam'];
    refLat = fallback.latitude;
    refLon = fallback.longitude;
    userLoc = 'Kochi Central';
    userDist = 'Ernakulam';
  }

  // Listing 1: Placed in the user's detected locality (~0.8 km offset)
  // ~0.005 lat offset ≈ 555m, ~0.005 lon offset ≈ 550m => sqrt(555^2 + 550^2) ≈ 780m (0.8 km)
  const loc1Lat = Math.round((refLat + 0.005) * 10000) / 10000;
  const loc1Lon = Math.round((refLon + 0.005) * 10000) / 10000;

  // Listings 2, 3, 4: Pick 3 distinct real nearby localities from actual geographic data
  const nearby = findNearbyRealLocalities(refLat, refLon, userLoc, 3);

  // If fewer than 3 were found (rare), fallback to distinct defaults
  const fallbackList: GeographicLocality[] = [
    { locality: 'Palarivattom', district: 'Ernakulam', latitude: 10.0033, longitude: 76.3075, region: 'Kerala' },
    { locality: 'Edappally', district: 'Ernakulam', latitude: 10.0261, longitude: 76.3125, region: 'Kerala' },
    { locality: 'Aluva', district: 'Ernakulam', latitude: 10.1076, longitude: 76.3516, region: 'Kerala' },
  ];

  const loc2 = nearby[0] || fallbackList[0];
  const loc3 = nearby[1] || fallbackList[1];
  const loc4 = nearby[2] || fallbackList[2];

  const assignments = [
    { locality: userLoc, district: userDist, latitude: loc1Lat, longitude: loc1Lon },
    { locality: loc2.locality, district: loc2.district, latitude: loc2.latitude, longitude: loc2.longitude },
    { locality: loc3.locality, district: loc3.district, latitude: loc3.latitude, longitude: loc3.longitude },
    { locality: loc4.locality, district: loc4.district, latitude: loc4.latitude, longitude: loc4.longitude },
  ];

  return DEMO_MATERIALS.map((item, index) => {
    const loc = assignments[index];
    const category = categories?.find((c) => c.id === item.category_id || c.slug === item.category_slug);

    return {
      id: item.id,
      user_id: DEMO_USER_PROFILE.id,
      category_id: item.category_id,
      title: item.title,
      description: item.purpose,
      material_type: item.material_type,
      quantity: item.quantity,
      unit: item.unit,
      listing_type: 'free' as const,
      price: 0,
      condition: item.condition,
      district: loc.district,
      locality: loc.locality,
      address: `${loc.locality}, ${loc.district}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: 'active' as const,
      ai_classified: true,
      ai_confidence: 96.5,
      suggested_action: item.suggested_action,
      created_at: new Date(Date.now() - (index + 1) * 3600000 * 2).toISOString(),
      is_demo: true,
      category,
      user: {
        ...DEMO_USER_PROFILE,
        district: loc.district,
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
      images: [item.image],
    };
  });
}

/**
 * Checks if a listing or ID is a demonstration sample.
 */
export function isDemoListing(listingOrId: string | WasteListing | null | undefined): boolean {
  if (!listingOrId) return false;
  if (typeof listingOrId === 'string') {
    return listingOrId.startsWith('demo-');
  }
  return Boolean(listingOrId.is_demo || listingOrId.id.startsWith('demo-'));
}
