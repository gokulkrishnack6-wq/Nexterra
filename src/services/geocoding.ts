/**
 * GreenLoop Geocoding & Location Autocomplete Service
 * Compliant with OpenStreetMap Nominatim usage policies (max 1 req/sec, proper User-Agent).
 * Provides hybrid instant local Kerala gazetteer search + remote OpenStreetMap Nominatim autocomplete.
 */

import { VERIFIED_REAL_LOCALITIES } from '../lib/demoMarketplace';
import { KERALA_DISTRICT_COORDS, matchKeralaDistrict, isInKeralaRegion, findNearestDistrict } from '../contexts/LocationContext';

export { VERIFIED_REAL_LOCALITIES, findNearestDistrict };

export interface LocationSuggestion {
  id: string;
  name: string;
  label: string;
  fullAddress: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isKerala: boolean;
}

let lastSearchTimestamp = 0;
let activeAbortController: AbortController | null = null;
const searchCache = new Map<string, LocationSuggestion[]>();

/**
 * Searches location suggestions using a hybrid of local Kerala gazetteer and OpenStreetMap Nominatim.
 * Debounced and rate-limited.
 */
export async function searchLocationAutocomplete(
  rawQuery: string,
  options: { limit?: number; keralaOnly?: boolean } = {}
): Promise<LocationSuggestion[]> {
  const query = (rawQuery || '').trim();
  if (query.length < 2) {
    return [];
  }

  const cacheKey = `${query.toLowerCase()}_${options.limit || 6}_${options.keralaOnly ? 'kerala' : 'all'}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // 1. Instant local Kerala gazetteer search
  const lower = query.toLowerCase();
  const localMatches: LocationSuggestion[] = [];

  // Match verified Kerala localities
  for (const item of VERIFIED_REAL_LOCALITIES) {
    if (
      item.locality.toLowerCase().includes(lower) ||
      item.district.toLowerCase().includes(lower) ||
      `${item.locality}, ${item.district}`.toLowerCase().includes(lower)
    ) {
      localMatches.push({
        id: `local-${item.locality}-${item.district}`.toLowerCase().replace(/[\s/]+/g, '-'),
        name: item.locality,
        label: `${item.locality}, ${item.district}, Kerala`,
        fullAddress: `${item.locality}, ${item.district}, Kerala, India`,
        locality: item.locality,
        city: item.locality,
        district: item.district,
        state: 'Kerala',
        pincode: '',
        latitude: item.latitude,
        longitude: item.longitude,
        isKerala: true,
      });
    }
  }

  // Match district centroids if typing a district name directly
  for (const [distName, coords] of Object.entries(KERALA_DISTRICT_COORDS)) {
    if (distName.toLowerCase().includes(lower)) {
      const exists = localMatches.some((m) => m.district.toLowerCase() === distName.toLowerCase() && m.name.toLowerCase() === distName.toLowerCase());
      if (!exists) {
        localMatches.push({
          id: `district-${distName.toLowerCase()}`,
          name: distName,
          label: `${distName} District, Kerala`,
          fullAddress: `${distName}, Kerala, India`,
          locality: distName,
          city: distName,
          district: distName,
          state: 'Kerala',
          pincode: '',
          latitude: coords.latitude,
          longitude: coords.longitude,
          isKerala: true,
        });
      }
    }
  }

  // If we already have strong local matches for a short query or user is searching Kerala, start with them
  let remoteResults: LocationSuggestion[] = [];

  // 2. Query OpenStreetMap Nominatim with rate limiting & abort controller
  try {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    const currentSignal = activeAbortController.signal;

    // Throttle to respect OpenStreetMap Nominatim 1 request/second guideline
    const now = Date.now();
    const timeSinceLast = now - lastSearchTimestamp;
    if (timeSinceLast < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
    }
    lastSearchTimestamp = Date.now();

    const limit = options.limit || 5;
    const viewboxParam = '&viewbox=74.8,12.8,77.5,8.2&bounded=0'; // Prioritize Kerala bounds
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=${limit}&countrycodes=in${viewboxParam}`;

    const res = await fetch(url, {
      signal: currentSignal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GreenLoop-CircularNetwork/1.0 (https://greenloop.eco; support@greenloop.eco)',
      },
    });

    if (res.ok) {
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        remoteResults = rawData.map((item: any, idx: number) => {
          const addr = item.address || {};
          const rawLocality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.village ||
            addr.town ||
            addr.city_district ||
            addr.city ||
            item.name ||
            '';

          const matchedDist =
            matchKeralaDistrict(addr.state_district) ||
            matchKeralaDistrict(addr.county) ||
            matchKeralaDistrict(addr.district) ||
            matchKeralaDistrict(addr.city) ||
            matchKeralaDistrict(addr.suburb) ||
            addr.state_district ||
            addr.county ||
            addr.district ||
            '';

          const stateName = addr.state || 'Kerala';
          const postcode = addr.postcode || '';
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const inKerala = isInKeralaRegion(lat, lon) || stateName.toLowerCase().includes('kerala');

          const labelParts = [
            rawLocality,
            matchedDist && matchedDist !== rawLocality ? matchedDist : '',
            stateName,
            postcode,
          ].filter(Boolean);

          return {
            id: `nom-${item.osm_id || idx}-${item.place_id || idx}`,
            name: rawLocality || item.display_name.split(',')[0],
            label: labelParts.join(', '),
            fullAddress: item.display_name,
            locality: rawLocality,
            city: addr.city || addr.town || rawLocality,
            district: matchedDist,
            state: stateName,
            pincode: postcode,
            latitude: lat,
            longitude: lon,
            isKerala: inKerala,
          };
        });
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('Nominatim autocomplete search notice:', err?.message);
    }
  }

  // Merge results: deduplicate by approximate coordinate proximity (~300m)
  const combined = [...localMatches, ...remoteResults];
  const uniqueSuggestions: LocationSuggestion[] = [];

  for (const s of combined) {
    const isDuplicate = uniqueSuggestions.some(
      (u) =>
        Math.abs(u.latitude - s.latitude) < 0.003 &&
        Math.abs(u.longitude - s.longitude) < 0.003
    );
    if (!isDuplicate) {
      uniqueSuggestions.push(s);
    }
    if (uniqueSuggestions.length >= (options.limit || 6)) break;
  }

  searchCache.set(cacheKey, uniqueSuggestions);
  return uniqueSuggestions;
}

/**
 * Reverse-geocodes a coordinate pair into a structured LocationSuggestion.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<LocationSuggestion> {
  const inKeralaRegion = isInKeralaRegion(lat, lon);
  let locality = '';
  let district = '';
  let city = '';
  let state = inKeralaRegion ? 'Kerala' : '';
  let pincode = '';
  let fullAddress = '';

  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=18&addressdetails=1`;
    const res = await fetch(nomUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GreenLoop-CircularNetwork/1.0 (https://greenloop.eco; support@greenloop.eco)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.village ||
          addr.town ||
          addr.city_district ||
          addr.city ||
          '';

        district =
          matchKeralaDistrict(addr.state_district) ||
          matchKeralaDistrict(addr.county) ||
          matchKeralaDistrict(addr.district) ||
          matchKeralaDistrict(addr.city) ||
          matchKeralaDistrict(addr.suburb) ||
          addr.state_district ||
          addr.district ||
          '';

        city = addr.city || addr.town || locality;
        state = addr.state || (inKeralaRegion ? 'Kerala' : '');
        pincode = addr.postcode || '';
        fullAddress = data.display_name || '';
      }
    }
  } catch (err) {
    console.warn('Reverse geocode error:', err);
  }

  // Fallback if remote failed
  if (!locality && inKeralaRegion) {
    const nearest = VERIFIED_REAL_LOCALITIES.find(
      (l) => Math.abs(l.latitude - lat) < 0.08 && Math.abs(l.longitude - lon) < 0.08
    );
    if (nearest) {
      locality = nearest.locality;
      district = nearest.district;
      city = nearest.locality;
      state = 'Kerala';
      fullAddress = `${nearest.locality}, ${nearest.district}, Kerala, India`;
    }
  }

  return {
    id: `rev-${lat.toFixed(4)}-${lon.toFixed(4)}`,
    name: locality || district || 'Detected Location',
    label: [locality, district, state, pincode].filter(Boolean).join(', '),
    fullAddress: fullAddress || `${locality || district}, ${state}, India`,
    locality: locality || district,
    city: city || locality || district,
    district: district || '',
    state: state || 'Kerala',
    pincode,
    latitude: lat,
    longitude: lon,
    isKerala: inKeralaRegion || state.toLowerCase().includes('kerala'),
  };
}
