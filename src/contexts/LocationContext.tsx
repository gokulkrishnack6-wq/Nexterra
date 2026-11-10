import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type GeolocationPermissionStatus =
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export type LocationSource =
  | 'undetected'
  | 'gps'
  | 'manual'
  | 'cache'
  | 'approximate';

export interface ResolvedAddress {
  locality: string;
  district: string;
  city: string;
  region: string;
  state: string;
  country: string;
  postcode: string;
  pincode: string;
  isKeralaBased: boolean;
  approximateDistrict?: string;
  resolutionQuality: 'exact' | 'approximate' | 'failed';
}

export interface GeolocationState {
  coords: LocationCoords | null;
  district: string;
  locality: string;
  city: string;
  region: string;
  state: string;
  country: string;
  postcode: string;
  pincode: string;
  isKeralaBased: boolean;
  approximateDistrict?: string;
  source: LocationSource;
  loading: boolean;
  error: string | null;
  permissionStatus: GeolocationPermissionStatus;
  resolvedAt: string | null;
}

export interface LocationContextType extends GeolocationState {
  detectLocation: (options?: { force?: boolean } | unknown) => Promise<void>;
  setManualDistrict: (districtName: string) => void;
  setManualLocation: (details: Partial<GeolocationState> & { district: string }) => void;
  clearError: () => void;
}

// Representative centroid coordinates for Kerala's 14 districts (used only for manual selection & map centering)
export const KERALA_DISTRICT_COORDS: Record<string, LocationCoords> = {
  'Alappuzha': { latitude: 9.4981, longitude: 76.3388 },
  'Ernakulam': { latitude: 9.9816, longitude: 76.2999 },
  'Idukki': { latitude: 9.8500, longitude: 76.9667 },
  'Kannur': { latitude: 11.8745, longitude: 75.3704 },
  'Kasaragod': { latitude: 12.4996, longitude: 74.9869 },
  'Kollam': { latitude: 8.8932, longitude: 76.6141 },
  'Kottayam': { latitude: 9.5916, longitude: 76.5222 },
  'Kozhikode': { latitude: 11.2588, longitude: 75.7804 },
  'Malappuram': { latitude: 11.0510, longitude: 76.0711 },
  'Palakkad': { latitude: 10.7867, longitude: 76.6548 },
  'Pathanamthitta': { latitude: 9.2648, longitude: 76.7870 },
  'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
  'Thrissur': { latitude: 10.5276, longitude: 76.2144 },
  'Wayanad': { latitude: 11.6854, longitude: 76.1320 },
};

/**
 * Calculates distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Computes the closest Kerala district centroid by geometric distance.
 * NOTE: This is purely a spatial proximity estimate and must NEVER be
 * presented as an official GPS-derived district without user confirmation.
 */
export function findNearestDistrict(lat: number, lon: number): string {
  let nearestDistrict = 'Ernakulam';
  let minDistance = Infinity;

  for (const [district, coords] of Object.entries(KERALA_DISTRICT_COORDS)) {
    const dist = calculateDistanceKm(lat, lon, coords.latitude, coords.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestDistrict = district;
    }
  }

  return nearestDistrict;
}

/**
 * Returns true if the coordinates lie within Kerala's geographic boundaries.
 * Bounding box spans ~8.1° N to 12.95° N and 74.8° E to 77.6° E, covering all 14 districts
 * from Parassala (South) to Manjeshwaram (North), with distance fallback to central Kerala.
 */
export function isInKeralaRegion(lat: number, lon: number): boolean {
  if (lat >= 8.1 && lat <= 12.95 && lon >= 74.8 && lon <= 77.6) {
    return true;
  }
  // Central Kerala radius fallback (~350 km covers entire state from 10.25 N, 76.35 E)
  const dist = calculateDistanceKm(lat, lon, 10.25, 76.35);
  return dist < 350;
}

/**
 * Strict normalizer: matches a candidate string against Kerala's 14 official administrative districts
 * or recognized vernacular city aliases.
 * Returns null if no match is found. NEVER falls back to Ernakulam or guesses.
 */
export function matchKeralaDistrict(candidate: string | undefined | null): string | null {
  if (!candidate || typeof candidate !== 'string') return null;

  const cleaned = candidate.replace(/\s+district$/i, '').trim();
  const lower = cleaned.toLowerCase();

  for (const standard of Object.keys(KERALA_DISTRICT_COORDS)) {
    if (standard.toLowerCase() === lower || lower.includes(standard.toLowerCase())) {
      return standard;
    }
  }

  // Common city & vernacular aliases for Kerala administrative headquarters
  if (lower === 'cochin' || lower === 'kochi') return 'Ernakulam';
  if (lower === 'calicut') return 'Kozhikode';
  if (lower === 'trivandrum') return 'Thiruvananthapuram';
  if (lower === 'alleppey') return 'Alappuzha';
  if (lower === 'cannur') return 'Kannur';
  if (lower === 'palghat') return 'Palakkad';
  if (lower === 'trichur') return 'Thrissur';
  if (lower === 'quilon') return 'Kollam';

  return null;
}

export const STORAGE_KEY_LOCATION = 'greenloop_user_location';
export const STORAGE_KEY_GEO_PERMISSION = 'greenloop_geo_permission';
export const STORAGE_KEY_GEO_DISMISSED = 'greenloop_geo_dismissed';
export const GEO_CACHE_PREFIX = 'greenloop_geo_cache_';

/**
 * High-accuracy browser geolocation options as required by specification
 */
export const BROWSER_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000, // 5 minutes cache
};

export function getSafeStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // blocked in restricted environments or private browsing
  }
  return null;
}

// OpenStreetMap Nominatim compliance tracker (max 1 request per second)
let lastNominatimTimestamp = 0;

/**
 * Reverse geocodes coordinates into detailed location components.
 * 1. Checks localStorage cache first (within ~100m precision).
 * 2. Tries Nominatim (OpenStreetMap) with a 4-second timeout, compliant with usage policy.
 * 3. Falls back to BigDataCloud client-side API.
 * 4. Never fabricates fake locality names or district names on failure.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ResolvedAddress> {
  const cacheKey = `${GEO_CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}`;

  // 1. Check local cache first
  const storage = getSafeStorage();
  if (storage) {
    const cached = storage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed as ResolvedAddress;
        }
      } catch {
        // ignore malformed cache
      }
    }
  }

  const inKeralaRegion = isInKeralaRegion(lat, lon);
  let resolved: ResolvedAddress | null = null;

  // 2. Try Nominatim (OpenStreetMap)
  try {
    const now = Date.now();
    const timeSinceLast = now - lastNominatimTimestamp;
    if (timeSinceLast < 1050) {
      // Throttle to respect OpenStreetMap Nominatim 1 request/sec policy
      await new Promise((r) => setTimeout(r, 1050 - timeSinceLast));
    }
    lastNominatimTimestamp = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=18&addressdetails=1`;
    const res = await fetch(nomUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GreenLoop-CircularNetwork/1.0 (https://greenloop.eco; team@greenloop.eco)',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const rawLocality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.village ||
          addr.town ||
          addr.hamlet ||
          addr.city_district ||
          addr.subdistrict ||
          addr.county ||
          addr.city ||
          '';

        const stateName = addr.state || '';
        const countryName = addr.country || 'India';
        const postcode = addr.postcode || '';

        const isActuallyKerala =
          stateName.toLowerCase().includes('kerala') ||
          (inKeralaRegion && countryName.toLowerCase() === 'india');

        if (isActuallyKerala) {
          // Identify matching Kerala administrative district
          const matchedDistrict =
            matchKeralaDistrict(addr.state_district) ||
            matchKeralaDistrict(addr.county) ||
            matchKeralaDistrict(addr.district) ||
            matchKeralaDistrict(addr.city) ||
            matchKeralaDistrict(addr.suburb);

          if (matchedDistrict) {
            resolved = {
              locality: rawLocality || matchedDistrict,
              district: matchedDistrict,
              city: addr.city || addr.town || matchedDistrict,
              region: 'Kerala',
              state: 'Kerala',
              country: 'India',
              postcode,
              pincode: postcode,
              isKeralaBased: true,
              approximateDistrict: undefined,
              resolutionQuality: 'exact',
            };
          } else {
            // In Kerala region, but exact district boundary unconfirmed by geocoder
            const approx = findNearestDistrict(lat, lon);
            resolved = {
              locality: rawLocality || '',
              district: '', // DO NOT present centroid as verified district
              city: addr.city || addr.town || '',
              region: 'Kerala',
              state: 'Kerala',
              country: 'India',
              postcode,
              pincode: postcode,
              isKeralaBased: true,
              approximateDistrict: approx,
              resolutionQuality: 'approximate',
            };
          }
        } else {
          // Visitor is outside Kerala — DO NOT assign any Kerala district!
          const nonKeralaDistrict = addr.state_district || addr.county || addr.city || stateName || 'Outside Kerala';
          resolved = {
            locality: rawLocality || nonKeralaDistrict,
            district: nonKeralaDistrict,
            city: addr.city || addr.town || nonKeralaDistrict,
            region: stateName,
            state: stateName,
            country: countryName,
            postcode,
            pincode: postcode,
            isKeralaBased: false,
            approximateDistrict: undefined,
            resolutionQuality: 'exact',
          };
        }
      }
    }
  } catch {
    // Nominatim network error or timeout; continue to secondary
  }

  // 3. Fallback to BigDataCloud client API if Nominatim didn't resolve
  if (!resolved) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=en`;
      const res = await fetch(bdcUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const admin = Array.isArray(data.localityInfo?.administrative)
          ? data.localityInfo.administrative
          : [];

        interface AdminLevelItem {
          name?: string;
          adminLevel?: number;
          description?: string;
        }

        const districtObj = admin.find(
          (a: AdminLevelItem) =>
            a.adminLevel === 5 ||
            (a.description && a.description.toLowerCase().includes('district'))
        );

        const rawDistrict = districtObj?.name || data.city || '';
        const rawLocality = data.locality || data.city || '';
        const stateName = data.principalSubdivision || '';
        const countryName = data.countryName || 'India';
        const postcode = data.postcode || '';

        const isActuallyKerala =
          stateName.toLowerCase().includes('kerala') ||
          (inKeralaRegion && countryName.toLowerCase() === 'india');

        if (isActuallyKerala) {
          const matchedDistrict = matchKeralaDistrict(rawDistrict) || matchKeralaDistrict(data.city);
          if (matchedDistrict) {
            resolved = {
              locality: rawLocality || matchedDistrict,
              district: matchedDistrict,
              city: data.city || matchedDistrict,
              region: 'Kerala',
              state: 'Kerala',
              country: 'India',
              postcode,
              pincode: postcode,
              isKeralaBased: true,
              approximateDistrict: undefined,
              resolutionQuality: 'exact',
            };
          } else {
            const approx = findNearestDistrict(lat, lon);
            resolved = {
              locality: rawLocality || '',
              district: '',
              city: data.city || '',
              region: 'Kerala',
              state: 'Kerala',
              country: 'India',
              postcode,
              pincode: postcode,
              isKeralaBased: true,
              approximateDistrict: approx,
              resolutionQuality: 'approximate',
            };
          }
        } else {
          // Visitor outside Kerala
          const nonKeralaDistrict = rawDistrict || stateName || 'Outside Kerala';
          resolved = {
            locality: rawLocality || nonKeralaDistrict,
            district: nonKeralaDistrict,
            city: data.city || nonKeralaDistrict,
            region: stateName,
            state: stateName,
            country: countryName,
            postcode,
            pincode: postcode,
            isKeralaBased: false,
            approximateDistrict: undefined,
            resolutionQuality: 'exact',
          };
        }
      }
    } catch {
      // BigDataCloud failed as well
    }
  }

  // 4. Fallback if both remote providers failed (offline / network error)
  if (!resolved) {
    if (inKeralaRegion) {
      resolved = {
        locality: '',
        district: '',
        city: '',
        region: 'Kerala',
        state: 'Kerala',
        country: 'India',
        postcode: '',
        pincode: '',
        isKeralaBased: true,
        approximateDistrict: findNearestDistrict(lat, lon),
        resolutionQuality: 'failed',
      };
    } else {
      resolved = {
        locality: '',
        district: '',
        city: '',
        region: '',
        state: '',
        country: '',
        postcode: '',
        pincode: '',
        isKeralaBased: false,
        approximateDistrict: undefined,
        resolutionQuality: 'failed',
      };
    }
  }

  // Only cache successful resolutions (do not permanently cache failed lookups)
  if (storage && resolved && resolved.resolutionQuality !== 'failed') {
    try {
      storage.setItem(cacheKey, JSON.stringify(resolved));
    } catch {
      // Storage quota or private browsing safeguard
    }
  }

  return resolved;
}

/**
 * Clean, explicit undetected state for first-time visitors.
 * No fabricated coordinates, locality, or district names.
 */
export const DEFAULT_LOCATION_STATE: GeolocationState = {
  coords: null,
  district: '',
  locality: '',
  city: '',
  region: '',
  state: '',
  country: '',
  postcode: '',
  pincode: '',
  isKeralaBased: false,
  approximateDistrict: undefined,
  source: 'undetected',
  loading: false,
  error: null,
  permissionStatus: 'prompt',
  resolvedAt: null,
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GeolocationState>(() => {
    const storage = getSafeStorage();
    if (storage) {
      const saved = storage.getItem(STORAGE_KEY_LOCATION);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_LOCATION_STATE,
            ...parsed,
            loading: false,
            error: null,
            source: parsed.source || 'cache',
          };
        } catch {
          // ignore corrupted JSON
        }
      }
    }
    return DEFAULT_LOCATION_STATE;
  });

  // Track initial mount to prevent repeated detection across re-renders
  const autoDetectRunRef = useRef(false);

  // Sync to localStorage whenever state changes meaningfully (only when actually detected or manually set)
  useEffect(() => {
    const storage = getSafeStorage();
    if (storage && (state.coords !== null || state.district !== '')) {
      try {
        storage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(state));
      } catch {
        // ignore
      }
    }
  }, [state]);

  /**
   * Applies raw coordinates, executes reverse geocoding, and synchronizes state
   */
  const applyCoordinates = useCallback(async (
    lat: number,
    lon: number,
    accuracy?: number
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const inKerala = isInKeralaRegion(lat, lon);

    try {
      const address = await reverseGeocode(lat, lon);

      if (address.resolutionQuality === 'exact' && address.district) {
        setState({
          coords: { latitude: lat, longitude: lon, accuracy },
          district: address.district,
          locality: address.locality || address.district,
          city: address.city || address.district,
          region: address.region || address.state,
          state: address.state || address.region,
          country: address.country || 'India',
          postcode: address.postcode,
          pincode: address.pincode || address.postcode,
          isKeralaBased: address.isKeralaBased,
          approximateDistrict: undefined,
          source: 'gps',
          loading: false,
          error: null,
          permissionStatus: 'granted',
          resolvedAt: new Date().toISOString(),
        });
      } else {
        // Geocoding was approximate or failed to match an exact administrative district
        setState({
          coords: { latitude: lat, longitude: lon, accuracy },
          district: '',
          locality: address.locality || `GPS Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
          city: address.city || '',
          region: address.region || (inKerala ? 'Kerala' : ''),
          state: address.state || (inKerala ? 'Kerala' : ''),
          country: address.country || 'India',
          postcode: address.postcode,
          pincode: address.pincode || address.postcode,
          isKeralaBased: inKerala,
          approximateDistrict: address.approximateDistrict,
          source: 'approximate',
          loading: false,
          error: null,
          permissionStatus: 'granted',
          resolvedAt: new Date().toISOString(),
        });
      }

      const storage = getSafeStorage();
      storage?.setItem(STORAGE_KEY_GEO_PERMISSION, 'granted');
      storage?.removeItem(STORAGE_KEY_GEO_DISMISSED);
    } catch {
      // Reverse geocoding network error: retain coordinates, do NOT fabricate district name
      const approx = inKerala ? findNearestDistrict(lat, lon) : undefined;
      setState({
        coords: { latitude: lat, longitude: lon, accuracy },
        district: '',
        locality: `GPS Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
        city: '',
        region: inKerala ? 'Kerala' : '',
        state: inKerala ? 'Kerala' : '',
        country: inKerala ? 'India' : '',
        postcode: '',
        pincode: '',
        isKeralaBased: inKerala,
        approximateDistrict: approx,
        source: 'approximate',
        loading: false,
        error: null,
        permissionStatus: 'granted',
        resolvedAt: new Date().toISOString(),
      });

      const storage = getSafeStorage();
      storage?.setItem(STORAGE_KEY_GEO_PERMISSION, 'granted');
    }
  }, []);

  /**
   * Triggers the Browser Geolocation API
   */
  const requestBrowserPosition = useCallback((silent = false): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Geolocation is not supported by your browser.',
          permissionStatus: 'unsupported',
        }));
        resolve();
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await applyCoordinates(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
          resolve();
        },
        (err) => {
          let errorMsg = 'Failed to retrieve location.';
          let permStatus: GeolocationPermissionStatus = 'prompt';

          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied. You can select your district manually.';
            permStatus = 'denied';
            const storage = getSafeStorage();
            storage?.setItem(STORAGE_KEY_GEO_PERMISSION, 'denied');
            storage?.setItem(STORAGE_KEY_GEO_DISMISSED, 'true');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is currently unavailable. Please check your GPS settings or select manually.';
            permStatus = 'unavailable';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Please retry or select your district manually.';
            permStatus = 'timeout';
          }

          setState((prev) => ({
            ...prev,
            loading: false,
            error: silent ? null : errorMsg,
            permissionStatus: permStatus,
          }));
          resolve();
        },
        BROWSER_GEO_OPTIONS
      );
    });
  }, [applyCoordinates]);

  /**
   * Public detectLocation function for manual retry or UI triggers
   */
  const detectLocation = useCallback(async (options?: { force?: boolean } | unknown) => {
    const isForce =
      typeof options === 'object' &&
      options !== null &&
      'force' in options &&
      Boolean((options as { force?: boolean }).force);

    if (isForce) {
      const storage = getSafeStorage();
      storage?.removeItem(STORAGE_KEY_GEO_PERMISSION);
      storage?.removeItem(STORAGE_KEY_GEO_DISMISSED);
    }
    await requestBrowserPosition(false);
  }, [requestBrowserPosition]);

  /**
   * Manual district selection (e.g. from navbar dropdown or Kerala district selector)
   */
  const setManualDistrict = useCallback((districtName: string) => {
    const coords = KERALA_DISTRICT_COORDS[districtName] || null;
    setState({
      coords,
      district: districtName,
      locality: districtName,
      city: districtName,
      region: 'Kerala',
      state: 'Kerala',
      country: 'India',
      postcode: '',
      pincode: '',
      isKeralaBased: true,
      approximateDistrict: undefined,
      source: 'manual',
      loading: false,
      error: null,
      permissionStatus: 'prompt',
      resolvedAt: new Date().toISOString(),
    });
  }, []);

  /**
   * Manual full location setting with arbitrary details
   */
  const setManualLocation = useCallback((details: Partial<GeolocationState> & { district: string }) => {
    const coords = details.coords || KERALA_DISTRICT_COORDS[details.district] || null;
    const inKerala = coords ? isInKeralaRegion(coords.latitude, coords.longitude) : true;

    setState((prev) => ({
      ...prev,
      ...details,
      coords,
      district: details.district,
      locality: details.locality || details.district,
      city: details.city || details.district,
      region: details.region || details.state || (inKerala ? 'Kerala' : ''),
      state: details.state || details.region || (inKerala ? 'Kerala' : ''),
      country: details.country || 'India',
      isKeralaBased: inKerala,
      approximateDistrict: undefined,
      source: 'manual',
      loading: false,
      error: null,
      resolvedAt: new Date().toISOString(),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Automatic detection on application mount:
   * 1. Runs once per session via autoDetectRunRef.
   * 2. Checks navigator.permissions when available.
   * 3. If granted or prompt, requests current position with specified options.
   * 4. If previously denied or dismissed, respects user preference without reprompting.
   */
  useEffect(() => {
    if (autoDetectRunRef.current) return;
    autoDetectRunRef.current = true;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({ ...prev, permissionStatus: 'unsupported' }));
      return;
    }

    const storage = getSafeStorage();
    const savedPermission = storage?.getItem(STORAGE_KEY_GEO_PERMISSION);
    const dismissed = storage?.getItem(STORAGE_KEY_GEO_DISMISSED) === 'true';

    // If already denied or user previously dismissed, do not re-trigger dialog
    if (savedPermission === 'denied' || dismissed) {
      setState((prev) => ({ ...prev, permissionStatus: 'denied' }));
      return;
    }

    // Check navigator.permissions API if available
    if (typeof navigator.permissions !== 'undefined' && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionResult) => {
          if (permissionResult.state === 'granted') {
            // Permission previously granted — detect silently without disrupting user
            requestBrowserPosition(true);
          } else if (permissionResult.state === 'prompt') {
            // First time visit: request location detection automatically
            requestBrowserPosition(false);
          } else if (permissionResult.state === 'denied') {
            setState((prev) => ({
              ...prev,
              permissionStatus: 'denied',
              error: 'Location permission denied. You can select your district manually.',
            }));
            const storage = getSafeStorage();
            storage?.setItem(STORAGE_KEY_GEO_PERMISSION, 'denied');
          }

          // Listen for external permission changes (e.g. user toggles in browser address bar)
          permissionResult.onchange = () => {
            if (permissionResult.state === 'granted') {
              requestBrowserPosition(true);
            } else if (permissionResult.state === 'denied') {
              setState((prev) => ({ ...prev, permissionStatus: 'denied' }));
              const storage = getSafeStorage();
              storage?.setItem(STORAGE_KEY_GEO_PERMISSION, 'denied');
            }
          };
        })
        .catch(() => {
          // Fallback if permissions query fails (e.g. in some iOS/Firefox environments)
          requestBrowserPosition(false);
        });
    } else {
      // Permissions API not available: invoke detection once
      requestBrowserPosition(false);
    }
  }, [requestBrowserPosition]);

  const contextValue = useMemo<LocationContextType>(
    () => ({
      ...state,
      detectLocation,
      setManualDistrict,
      setManualLocation,
      clearError,
    }),
    [state, detectLocation, setManualDistrict, setManualLocation, clearError]
  );

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

/**
 * Access the shared global location context
 */
export function useLocationContext(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    // Graceful fallback for components rendered without LocationProvider (e.g. isolated tests)
    return {
      ...DEFAULT_LOCATION_STATE,
      detectLocation: async () => {},
      setManualDistrict: () => {},
      setManualLocation: () => {},
      clearError: () => {},
    };
  }
  return context;
}
