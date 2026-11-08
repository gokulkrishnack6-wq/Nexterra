/**
 * GreenLoop Geolocation Hook & Utilities
 * Connects directly to the singleton LocationContext provider for shared,
 * synchronized application-wide location coordinates, address resolution, and manual overrides.
 */

import {
  useLocationContext,
  LocationCoords,
  GeolocationState,
  GeolocationPermissionStatus,
  ResolvedAddress,
  KERALA_DISTRICT_COORDS,
  calculateDistanceKm,
  findNearestDistrict,
  isInKeralaRegion,
  matchKeralaDistrict,
  reverseGeocode,
  STORAGE_KEY_LOCATION,
  STORAGE_KEY_GEO_PERMISSION,
  STORAGE_KEY_GEO_DISMISSED,
  GEO_CACHE_PREFIX,
  BROWSER_GEO_OPTIONS,
  DEFAULT_LOCATION_STATE,
} from '../contexts/LocationContext';

export type {
  LocationCoords,
  GeolocationState,
  GeolocationPermissionStatus,
  ResolvedAddress,
};

export {
  KERALA_DISTRICT_COORDS,
  calculateDistanceKm,
  findNearestDistrict,
  isInKeralaRegion,
  matchKeralaDistrict,
  reverseGeocode,
  STORAGE_KEY_LOCATION,
  STORAGE_KEY_GEO_PERMISSION,
  STORAGE_KEY_GEO_DISMISSED,
  GEO_CACHE_PREFIX,
  BROWSER_GEO_OPTIONS,
  DEFAULT_LOCATION_STATE,
};

/**
 * Hook to access and interact with GreenLoop's global location state.
 */
export function useGeolocation() {
  return useLocationContext();
}
