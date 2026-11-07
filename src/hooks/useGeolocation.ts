import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeolocationState {
  coords: LocationCoords | null;
  district: string;
  locality: string;
  city: string;
  region: string;
  country: string;
  isKeralaBased: boolean;
  loading: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
}

// Representative centroid coordinates for Kerala's 14 districts
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
 * Calculates distance between two coordinates in kilometers using Haversine formula
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
 * Finds the closest Kerala district to the given coordinates
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
 * Returns true if the given coords are within roughly ~200 km of Kerala's geographic centre
 */
function isInKeralaRegion(lat: number, lon: number): boolean {
  const dist = calculateDistanceKm(lat, lon, 10.25, 76.35);
  return dist < 200;
}

const STORAGE_KEY_LOCATION = 'greenloop_user_location';
const STORAGE_KEY_GEO_DISMISSED = 'greenloop_geo_dismissed';
const GEO_CACHE_PREFIX = 'greenloop_geo_cache_';

/**
 * Reverse-geocodes lat/lon via BigDataCloud free client-side API.
 * Checks localStorage cache first to avoid repeat requests.
 */
async function reverseGeocode(lat: number, lon: number): Promise<{
  locality: string;
  city: string;
  region: string;
  country: string;
}> {
  const cacheKey = `${GEO_CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore bad cache
    }
  }

  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=en`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Geocoding request failed');

  const data = await response.json();
  const result = {
    locality: data.locality || data.city || data.principalSubdivision || 'Unknown',
    city: data.city || data.locality || data.principalSubdivision || 'Unknown',
    region: data.principalSubdivision || '',
    country: data.countryName || '',
  };

  localStorage.setItem(cacheKey, JSON.stringify(result));
  return result;
}

const DEFAULT_STATE: GeolocationState = {
  coords: null,
  district: 'Ernakulam',
  locality: 'Kochi Metro Region',
  city: 'Kochi',
  region: 'Kerala',
  country: 'India',
  isKeralaBased: true,
  loading: false,
  error: null,
  permissionStatus: 'prompt',
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new fields exist for older cached states
        return {
          ...DEFAULT_STATE,
          ...parsed,
        };
      } catch {
        // fallback to default
      }
    }
    return DEFAULT_STATE;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(state));
  }, [state]);

  /**
   * Core function: given raw coordinates, reverse-geocodes and updates state.
   */
  const applyCoords = useCallback(async (latitude: number, longitude: number) => {
    const keralaBased = isInKeralaRegion(latitude, longitude);
    const nearestDistrict = keralaBased
      ? findNearestDistrict(latitude, longitude)
      : 'Ernakulam'; // Kerala fallback for marketplace filtering only

    try {
      const geo = await reverseGeocode(latitude, longitude);
      setState({
        coords: { latitude, longitude },
        district: keralaBased ? nearestDistrict : nearestDistrict,
        locality: geo.locality,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        isKeralaBased: keralaBased,
        loading: false,
        error: null,
        permissionStatus: 'granted',
      });
    } catch {
      // Geocoding failed — still update coords and use district fallback
      setState({
        coords: { latitude, longitude },
        district: nearestDistrict,
        locality: keralaBased ? `${nearestDistrict} (Auto-detected)` : 'Detected Location',
        city: keralaBased ? nearestDistrict : 'Detected Location',
        region: keralaBased ? 'Kerala' : '',
        country: keralaBased ? 'India' : '',
        isKeralaBased: keralaBased,
        loading: false,
        error: null,
        permissionStatus: 'granted',
      });
    }
  }, []);

  /**
   * Runs getCurrentPosition. Passes success coords to applyCoords.
   */
  const runGeoPosition = useCallback((silent: boolean) => {
    if (!navigator.geolocation) {
      if (!silent) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Geolocation is not supported by your browser.',
          permissionStatus: 'unsupported',
        }));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoords(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        let errorMsg = 'Failed to retrieve location.';
        let permission: 'denied' | 'prompt' = 'prompt';

        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. You can select your district manually.';
          permission = 'denied';
          localStorage.setItem(STORAGE_KEY_GEO_DISMISSED, 'true');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again or select manually.';
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: silent ? null : errorMsg,
          permissionStatus: permission,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 min cache
      }
    );
  }, [applyCoords]);

  /**
   * Auto-detect on mount — checks permission first, respects user dismissal.
   */
  useEffect(() => {
    // Don't re-detect if we already have coords from cache
    if (state.coords !== null) return;

    // If user previously dismissed the prompt, don't ask again
    if (localStorage.getItem(STORAGE_KEY_GEO_DISMISSED) === 'true') return;

    if (!navigator.geolocation) return;

    if (typeof navigator.permissions !== 'undefined') {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') {
            // Permission already granted — detect silently
            runGeoPosition(true);
          } else if (result.state === 'prompt') {
            // Will request permission via browser dialog — do it once
            runGeoPosition(false);
          }
          // If 'denied', do nothing — respect user decision
        })
        .catch(() => {
          // permissions API not available — attempt once
          runGeoPosition(false);
        });
    } else {
      // permissions API not available — attempt once
      runGeoPosition(false);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Manual trigger (e.g. "Detect My GPS Location" button click)
   */
  const detectLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_GEO_DISMISSED);
    runGeoPosition(false);
  }, [runGeoPosition]);

  /**
   * Manual Kerala district selection (backward-compatible)
   */
  const setManualDistrict = useCallback((districtName: string) => {
    const coords = KERALA_DISTRICT_COORDS[districtName] || KERALA_DISTRICT_COORDS['Ernakulam'];
    setState({
      coords,
      district: districtName,
      locality: `${districtName} Central`,
      city: districtName,
      region: 'Kerala',
      country: 'India',
      isKeralaBased: true,
      loading: false,
      error: null,
      permissionStatus: 'prompt',
    });
  }, []);

  return {
    ...state,
    detectLocation,
    setManualDistrict,
  };
}
