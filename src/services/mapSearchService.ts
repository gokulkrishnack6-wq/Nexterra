import { KERALA_DISTRICTS, KERALA_MUNICIPAL_BODIES, MunicipalBody, KeralaDistrictInfo } from '../data/keralaAdministrativeData';
import { VERIFIED_REAL_LOCALITIES, GeographicLocality } from '../lib/demoMarketplace';
import { matchKeralaDistrict } from '../contexts/LocationContext';
import { WasteLocation, WasteListing } from '../types';

export type MapSuggestionType =
  | 'district'
  | 'municipality'
  | 'place'
  | 'material'
  | 'public_bin'
  | 'collection_centre'
  | 'pincode';

export interface MapSearchSuggestion {
  id: string;
  type: MapSuggestionType;
  title: string;
  subtitle: string;
  categoryLabel: string;
  district?: string;
  municipality?: string;
  latitude?: number;
  longitude?: number;
  zoomLevel?: number;
  bounds?: [[number, number], [number, number]];
  materialKeyword?: string;
  listingCount?: number;
  locationId?: string;
  listingId?: string;
  location?: WasteLocation;
  listing?: WasteListing;
}

/**
 * Calculates geographic bounding box for any Kerala district based on its municipal bodies and localities.
 */
export function getDistrictBounds(districtName: string): [[number, number], [number, number]] | null {
  const normDist = districtName.toLowerCase().trim();
  const bodies = KERALA_MUNICIPAL_BODIES.filter((b) => b.district.toLowerCase() === normDist);
  const localities = VERIFIED_REAL_LOCALITIES.filter((l) => l.district.toLowerCase() === normDist);

  const points: { lat: number; lng: number }[] = [
    ...bodies.map((b) => ({ lat: b.latitude, lng: b.longitude })),
    ...localities.map((l) => ({ lat: l.latitude, lng: l.longitude })),
  ];

  const distInfo = KERALA_DISTRICTS.find((d) => d.name.toLowerCase() === normDist);
  if (distInfo) {
    points.push({ lat: distInfo.latitude, lng: distInfo.longitude });
  }

  if (points.length === 0) return null;

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  // Add 0.08 degree buffer around district envelope
  return [
    [minLat - 0.08, minLng - 0.08],
    [maxLat + 0.08, maxLng + 0.08],
  ];
}

/**
 * Calculates geographic bounding box around a set of waste listings.
 */
export function computeListingBounds(listings: WasteListing[]): [[number, number], [number, number]] | null {
  const valid = listings.filter((l) => typeof l.latitude === 'number' && typeof l.longitude === 'number' && l.latitude !== 0);
  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const lat = valid[0].latitude!;
    const lng = valid[0].longitude!;
    return [
      [lat - 0.02, lng - 0.02],
      [lat + 0.02, lng + 0.02],
    ];
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const l of valid) {
    if (l.latitude! < minLat) minLat = l.latitude!;
    if (l.latitude! > maxLat) maxLat = l.latitude!;
    if (l.longitude! < minLng) minLng = l.longitude!;
    if (l.longitude! > maxLng) maxLng = l.longitude!;
  }

  // Padding
  return [
    [minLat - 0.03, minLng - 0.03],
    [maxLat + 0.03, maxLng + 0.03],
  ];
}

interface CommonMaterialArchetype {
  id: string;
  name: string;
  aliases: string[];
}

const COMMON_CIRCULAR_MATERIALS: CommonMaterialArchetype[] = [
  { id: 'plastic', name: 'Plastic Materials', aliases: ['plastic', 'pet', 'hdpe', 'bottle', 'bottles', 'polythene', 'container'] },
  { id: 'cardboard', name: 'Cardboard & Boxes', aliases: ['cardboard', 'box', 'boxes', 'carton', 'cartons', 'kraft', 'corrugated'] },
  { id: 'paper', name: 'Paper & Newsprint', aliases: ['paper', 'newspaper', 'books', 'magazines', 'sheets', 'documents'] },
  { id: 'metal', name: 'Scrap Metal', aliases: ['metal', 'scrap', 'iron', 'steel', 'aluminum', 'copper', 'brass', 'tin', 'wire'] },
  { id: 'glass', name: 'Glass Containers', aliases: ['glass', 'bottle', 'jar', 'cullet'] },
  { id: 'coconut', name: 'Coconut Husk & Biomass', aliases: ['coconut', 'husk', 'coir', 'shell', 'biomass', 'fibre'] },
  { id: 'organic', name: 'Organic & Food Waste', aliases: ['organic', 'food', 'compost', 'kitchen', 'wet waste', 'biowaste'] },
  { id: 'ewaste', name: 'Electronic Waste', aliases: ['electronic', 'ewaste', 'e-waste', 'appliance', 'battery', 'cable', 'circuit'] },
  { id: 'textile', name: 'Textiles & Fabric', aliases: ['textile', 'cloth', 'clothes', 'fabric', 'cotton', 'garments'] },
  { id: 'rubber', name: 'Rubber & Tyres', aliases: ['rubber', 'tyre', 'tire', 'tube'] },
];

/**
 * Generates smart multi-category autocomplete suggestions for the Kerala Waste Discovery Map.
 */
export function generateMapSearchSuggestions(
  rawQuery: string,
  wasteLocations: WasteLocation[],
  activeListings: WasteListing[],
  currentDistrict?: string
): MapSearchSuggestion[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const suggestions: MapSearchSuggestion[] = [];
  const seenIds = new Set<string>();

  const isNumericOnly = /^\d+$/.test(query);

  // --------------------------------------------------------------------------
  // 1. PINCODE MATCHES (if numbers are typed)
  // --------------------------------------------------------------------------
  if (isNumericOnly && query.length >= 3) {
    // Match in municipalities
    for (const body of KERALA_MUNICIPAL_BODIES) {
      if (body.pincode && body.pincode.startsWith(query)) {
        const id = `pin-${body.pincode}-${body.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          suggestions.push({
            id,
            type: 'pincode',
            title: `PIN ${body.pincode} (${body.name})`,
            subtitle: `PIN Code • ${body.name}, ${body.district}`,
            categoryLabel: 'PIN Code',
            district: body.district,
            municipality: body.name,
            latitude: body.latitude,
            longitude: body.longitude,
            zoomLevel: 14,
          });
        }
      }
    }

    // Match in waste locations
    for (const loc of wasteLocations) {
      if (loc.pincode && loc.pincode.startsWith(query)) {
        const id = `pin-loc-${loc.pincode}-${loc.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          suggestions.push({
            id,
            type: 'pincode',
            title: `PIN ${loc.pincode} (${loc.name})`,
            subtitle: `PIN Code • ${loc.address}`,
            categoryLabel: 'PIN Code',
            district: loc.district,
            municipality: loc.municipality,
            latitude: loc.latitude,
            longitude: loc.longitude,
            zoomLevel: 15,
            locationId: loc.id,
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. DISTRICT MATCHES (14 Kerala Districts)
  // --------------------------------------------------------------------------
  for (const d of KERALA_DISTRICTS) {
    if (d.name.toLowerCase().includes(query)) {
      const id = `dist-${d.name.toLowerCase()}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const bounds = getDistrictBounds(d.name);
        suggestions.push({
          id,
          type: 'district',
          title: d.name,
          subtitle: `District • Kerala (HQ: ${d.headquarters})`,
          categoryLabel: 'District',
          district: d.name,
          latitude: d.latitude,
          longitude: d.longitude,
          zoomLevel: 11,
          bounds: bounds || undefined,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 3. CITIES & MUNICIPALITIES (93 Urban Local Bodies)
  // --------------------------------------------------------------------------
  for (const body of KERALA_MUNICIPAL_BODIES) {
    if (
      body.name.toLowerCase().includes(query) ||
      `${body.name} ${body.district}`.toLowerCase().includes(query)
    ) {
      const id = `mun-${body.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const isCorp = body.type === 'corporation';
        suggestions.push({
          id,
          type: 'municipality',
          title: body.name,
          subtitle: `${isCorp ? 'Municipal Corporation' : 'Municipality'} • ${body.district}`,
          categoryLabel: isCorp ? 'Corporation' : 'Municipality',
          district: body.district,
          municipality: body.name,
          latitude: body.latitude,
          longitude: body.longitude,
          zoomLevel: isCorp ? 13 : 14,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. PLACES & LOCALITIES (Authentic Kerala Gazetteer)
  // --------------------------------------------------------------------------
  for (const p of VERIFIED_REAL_LOCALITIES) {
    if (
      p.locality.toLowerCase().includes(query) ||
      `${p.locality} ${p.district}`.toLowerCase().includes(query)
    ) {
      const id = `place-${p.locality.toLowerCase()}-${p.district.toLowerCase()}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        suggestions.push({
          id,
          type: 'place',
          title: p.locality,
          subtitle: `Place / Locality • ${p.district}`,
          categoryLabel: 'Place',
          district: p.district,
          latitude: p.latitude,
          longitude: p.longitude,
          zoomLevel: 14,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. WASTE MATERIALS (Matching Available Marketplace Listings)
  // --------------------------------------------------------------------------
  // A. Check common circular materials
  for (const mat of COMMON_CIRCULAR_MATERIALS) {
    const isKeywordMatch =
      mat.name.toLowerCase().includes(query) ||
      mat.aliases.some((alias) => alias.includes(query) || query.includes(alias));

    if (isKeywordMatch) {
      // Find matching active listings
      const matching = activeListings.filter((l) => {
        const text = `${l.title} ${l.material_type || ''} ${l.category?.name || ''} ${l.description}`.toLowerCase();
        return mat.aliases.some((alias) => text.includes(alias)) || text.includes(mat.id);
      });

      const id = `material-archetype-${mat.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const bounds = computeListingBounds(matching);
        const count = matching.length;
        const first = matching[0];

        suggestions.push({
          id,
          type: 'material',
          title: mat.name,
          subtitle: `Waste Material • ${count} available listing${count === 1 ? '' : 's'} across Kerala`,
          categoryLabel: 'Waste Material',
          materialKeyword: mat.id,
          listingCount: count,
          bounds: bounds || undefined,
          latitude: first?.latitude,
          longitude: first?.longitude,
          zoomLevel: count === 1 ? 15 : undefined,
          listingId: count === 1 ? first?.id : undefined,
        });
      }
    }
  }

  // B. Direct title/material matches from listings
  for (const list of activeListings) {
    const titleMatch = list.title.toLowerCase().includes(query);
    const matMatch = (list.material_type || '').toLowerCase().includes(query);

    if (titleMatch || matMatch) {
      const id = `material-listing-${list.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        suggestions.push({
          id,
          type: 'material',
          title: list.title,
          subtitle: `Waste Material • ${list.quantity} ${list.unit || 'kg'} in ${list.locality || list.district}`,
          categoryLabel: 'Available Waste',
          materialKeyword: list.title.toLowerCase(),
          district: list.district,
          municipality: list.locality,
          latitude: list.latitude,
          longitude: list.longitude,
          zoomLevel: 15,
          listingId: list.id,
          listing: list,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. PUBLIC WASTE BINS & COLLECTION CENTRES
  // --------------------------------------------------------------------------
  const isRecyclingSearch =
    query.includes('recycl') ||
    query.includes('centre') ||
    query.includes('center') ||
    query.includes('mcf') ||
    query.includes('rrf') ||
    query.includes('facility');

  const isBinSearch =
    query.includes('bin') ||
    query.includes('waste') ||
    query.includes('disposal') ||
    query.includes('station');

  for (const loc of wasteLocations) {
    const isBin = loc.location_type === 'public_bin';
    const isCentre = loc.location_type === 'collection_centre';

    const matchesName = loc.name.toLowerCase().includes(query);
    const matchesAddress = loc.address.toLowerCase().includes(query);
    const matchesMun = loc.municipality.toLowerCase().includes(query);
    const matchesDist = loc.district.toLowerCase().includes(query);
    const matchesCat = loc.accepted_waste_categories?.some((c) => c.toLowerCase().includes(query));

    const matchesFacility =
      matchesName ||
      matchesAddress ||
      (isBinSearch && isBin) ||
      (isRecyclingSearch && isCentre) ||
      matchesCat;

    if (matchesFacility) {
      const id = `loc-${loc.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        suggestions.push({
          id,
          type: isBin ? 'public_bin' : 'collection_centre',
          title: loc.name,
          subtitle: `${isBin ? 'Public Waste Bin' : 'Collection & Recycling Centre'} • ${loc.municipality || loc.district}`,
          categoryLabel: isBin ? 'Public Waste Bin' : 'Collection Centre',
          district: loc.district,
          municipality: loc.municipality,
          latitude: loc.latitude,
          longitude: loc.longitude,
          zoomLevel: 16,
          locationId: loc.id,
          location: loc,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // SORTING & PRIORITY RANKING
  // --------------------------------------------------------------------------
  // 1. Exact start-of-title matches first
  // 2. High relevance types (City/Municipality, District, Material)
  // 3. If user is in a district, prioritize results matching that district
  suggestions.sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(query);
    const bStarts = b.title.toLowerCase().startsWith(query);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Type priority ranking
    const typeRank: Record<MapSuggestionType, number> = {
      municipality: 1,
      district: 2,
      material: 3,
      place: 4,
      public_bin: 5,
      collection_centre: 6,
      pincode: 7,
    };

    const rankDiff = (typeRank[a.type] || 9) - (typeRank[b.type] || 9);
    if (rankDiff !== 0) return rankDiff;

    // Current district proximity
    if (currentDistrict && currentDistrict !== 'All Kerala') {
      const aInDist = a.district?.toLowerCase() === currentDistrict.toLowerCase();
      const bInDist = b.district?.toLowerCase() === currentDistrict.toLowerCase();
      if (aInDist && !bInDist) return -1;
      if (!aInDist && bInDist) return 1;
    }

    return 0;
  });

  // Limit to top 10 most relevant suggestions
  return suggestions.slice(0, 10);
}

/**
 * Intelligently merges verified seed locations with database/cached records.
 * - Guarantees all 500+ verified locations across Kerala are preserved.
 * - Allows database/user updates to override matching records by id or source_reference.
 * - Appends newly submitted community locations at the top.
 */
export function mergeWasteLocations(
  seedList: WasteLocation[],
  overrideList: WasteLocation[]
): WasteLocation[] {
  if (!overrideList || overrideList.length === 0) return seedList;
  if (!seedList || seedList.length === 0) return overrideList;

  const map = new Map<string, WasteLocation>();

  // 1. Index seed list
  for (const item of seedList) {
    map.set(item.id, item);
    if (item.source_reference) map.set(item.source_reference, item);
  }

  // 2. Identify community additions & updates
  const additions: WasteLocation[] = [];
  for (const item of overrideList) {
    if (map.has(item.id) || (item.source_reference && map.has(item.source_reference))) {
      // Update existing record
      map.set(item.id, item);
      if (item.source_reference) map.set(item.source_reference, item);
    } else {
      additions.push(item);
    }
  }

  // 3. Assemble unique result: additions first, then updated seeds
  const result: WasteLocation[] = [];
  const seenIds = new Set<string>();

  for (const item of [...additions, ...overrideList, ...seedList]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      const resolved = map.get(item.id) || map.get(item.source_reference || '') || item;
      result.push(resolved);
    }
  }

  return result;
}

/**
 * Determines whether a waste location, listing, or facility belongs to a specific Kerala district.
 * Uses a multi-tiered resolution model:
 * 1. Direct district match (case-insensitive)
 * 2. Vernacular / city aliases via matchKeralaDistrict (e.g. "Kochi" -> "Ernakulam", "Trivandrum" -> "Thiruvananthapuram")
 * 3. Official Municipal Body (ULB) affiliation: matches item's municipality against all 93 ULBs
 * 4. Known Locality affiliation: matches item's locality against verified Kerala localities
 * 5. Full address text inspection: checks if address contains the district or any of its ULBs / aliases
 */
export function isLocationInDistrict(
  item: {
    district?: string | null;
    municipality?: string | null;
    locality?: string | null;
    address?: string | null;
    formatted_address?: string | null;
    name?: string | null;
  },
  selectedDistrict: string
): boolean {
  if (!selectedDistrict || selectedDistrict === 'All Kerala') {
    return true;
  }

  const targetDistrict = selectedDistrict.trim().toLowerCase();

  // 1. Direct match on district field or normalized district alias
  if (item.district) {
    const rawDist = item.district.trim().toLowerCase();
    if (rawDist === targetDistrict) return true;
    const matched = matchKeralaDistrict(item.district);
    if (matched && matched.toLowerCase() === targetDistrict) return true;
  }

  // 2. Official Municipal Body (ULB) affiliation:
  // e.g. "Kalamassery" or "Aluva" belongs to "Ernakulam"
  if (item.municipality) {
    const munLower = item.municipality.trim().toLowerCase();
    const municipalBody = KERALA_MUNICIPAL_BODIES.find(
      (b) => b.name.toLowerCase() === munLower
    );
    if (municipalBody && municipalBody.district.toLowerCase() === targetDistrict) {
      return true;
    }
  }

  // 3. Known Locality affiliation:
  // e.g. "Edappally" or "Kaloor" belongs to "Ernakulam"
  if (item.locality) {
    const locLower = item.locality.trim().toLowerCase();
    const knownLoc = VERIFIED_REAL_LOCALITIES.find(
      (l) => l.locality.toLowerCase() === locLower
    );
    if (knownLoc && knownLoc.district.toLowerCase() === targetDistrict) {
      return true;
    }
  }

  // 4. Address text inspection
  const fullAddress = `${item.address || ''} ${item.formatted_address || ''} ${item.name || ''}`.toLowerCase();
  if (fullAddress) {
    // Does the address explicitly contain the district name?
    if (fullAddress.includes(targetDistrict)) {
      return true;
    }

    // Does the address contain any municipal body belonging to this district?
    const districtBodies = KERALA_MUNICIPAL_BODIES.filter(
      (b) => b.district.toLowerCase() === targetDistrict
    );
    for (const body of districtBodies) {
      if (fullAddress.includes(body.name.toLowerCase())) {
        return true;
      }
    }

    // Check vernacular aliases in address
    if (targetDistrict === 'ernakulam' && (fullAddress.includes('kochi') || fullAddress.includes('cochin'))) {
      return true;
    }
    if (targetDistrict === 'thiruvananthapuram' && fullAddress.includes('trivandrum')) {
      return true;
    }
    if (targetDistrict === 'kozhikode' && fullAddress.includes('calicut')) {
      return true;
    }
    if (targetDistrict === 'kannur' && (fullAddress.includes('cannur') || fullAddress.includes('cannanore'))) {
      return true;
    }
    if (targetDistrict === 'alappuzha' && fullAddress.includes('alleppey')) {
      return true;
    }
    if (targetDistrict === 'palakkad' && fullAddress.includes('palghat')) {
      return true;
    }
    if (targetDistrict === 'thrissur' && fullAddress.includes('trichur')) {
      return true;
    }
    if (targetDistrict === 'kollam' && fullAddress.includes('quilon')) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether a waste location, listing, or facility belongs to a specific municipality.
 */
export function isLocationInMunicipality(
  item: {
    municipality?: string | null;
    locality?: string | null;
    address?: string | null;
    formatted_address?: string | null;
    name?: string | null;
  },
  selectedMunicipality: string
): boolean {
  if (
    !selectedMunicipality ||
    selectedMunicipality === 'All Municipalities' ||
    selectedMunicipality.startsWith('All in ')
  ) {
    return true;
  }

  const targetMun = selectedMunicipality.trim().toLowerCase();

  // 1. Direct municipality match
  if (item.municipality && item.municipality.trim().toLowerCase() === targetMun) {
    return true;
  }

  // 2. Locality match
  if (item.locality && item.locality.trim().toLowerCase().includes(targetMun)) {
    return true;
  }

  // 3. Address & Name substring match
  const fullText = `${item.address || ''} ${item.formatted_address || ''} ${item.name || ''}`.toLowerCase();
  if (fullText.includes(targetMun)) {
    return true;
  }

  return false;
}



