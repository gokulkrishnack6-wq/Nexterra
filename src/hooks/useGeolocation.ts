import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeolocationState {
  coords: LocationCoords | null;
  district: string;
  locality: string;
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

const STORAGE_KEY_LOCATION = 'greenloop_user_location';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      coords: null,
      district: 'Ernakulam',
      locality: 'Kochi Metro Region',
      loading: false,
      error: null,
      permissionStatus: 'prompt',
    };
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(state));
  }, [state]);

  // Request browser geolocation
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser.',
        permissionStatus: 'unsupported',
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const district = findNearestDistrict(latitude, longitude);

        setState({
          coords: { latitude, longitude },
          district,
          locality: `${district} (Auto-detected)`,
          loading: false,
          error: null,
          permissionStatus: 'granted',
        });
      },
      (err) => {
        let errorMsg = 'Failed to retrieve location.';
        let permission: 'denied' | 'prompt' = 'prompt';

        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. You can select your district manually.';
          permission = 'denied';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again or select manually.';
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
          permissionStatus: permission,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Manual district override
  const setManualDistrict = useCallback((districtName: string) => {
    const coords = KERALA_DISTRICT_COORDS[districtName] || KERALA_DISTRICT_COORDS['Ernakulam'];
    setState({
      coords,
      district: districtName,
      locality: `${districtName} Central`,
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
