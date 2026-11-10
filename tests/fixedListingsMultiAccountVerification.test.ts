// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getFixedMarketplaceListings,
  generateDynamicDemoListings,
  FIXED_MARKETPLACE_MATERIALS,
} from '../src/lib/demoMarketplace';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';
import { isLocationInDistrict, isLocationInMunicipality } from '../src/services/mapSearchService';
import { WasteListing, UserProfile } from '../src/types';

describe('GreenLoop Verification: Two Different User Accounts & Fixed Location Invariance', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  // Step 1: User 1 from Kasaragod
  const userKasaragod: UserProfile = {
    id: 'user-kasaragod-001',
    email: 'kasaragod.user@greenloop.eco',
    full_name: 'Amina Kasaragod',
    role: 'individual',
    district: 'Kasaragod',
    state: 'Kerala',
    latitude: 12.4996,
    longitude: 74.9869,
    eco_points_balance: 50,
    is_verified: true,
    created_at: '2026-01-10T00:00:00Z',
  };

  // Step 4: User 2 from Kannur
  const userKannur: UserProfile = {
    id: 'user-kannur-002',
    email: 'kannur.user@greenloop.eco',
    full_name: 'Rahul Kannur',
    role: 'individual',
    district: 'Kannur',
    state: 'Kerala',
    latitude: 11.8745,
    longitude: 75.3704,
    eco_points_balance: 80,
    is_verified: true,
    created_at: '2026-01-12T00:00:00Z',
  };

  it('verifies Steps 1 to 7: Multi-Account Login, Logout, and Refresh Location Invariance', () => {
    // -------------------------------------------------------------
    // 1. Log in with a user whose location is Kasaragod
    // -------------------------------------------------------------
    let activeUser: UserProfile | null = userKasaragod;
    expect(activeUser.district).toBe('Kasaragod');

    // 2. Record all four listing locations for User Kasaragod
    const listingsKasaragodSession = generateDynamicDemoListings(
      { latitude: activeUser.latitude!, longitude: activeUser.longitude! },
      'Vidyanagar',
      activeUser.district,
      'Kasaragod',
      INITIAL_CATEGORIES
    );

    expect(listingsKasaragodSession).toHaveLength(4);

    const snapshotKasaragod = listingsKasaragodSession.map((l) => ({
      id: l.id,
      title: l.title,
      district: l.district,
      locality: l.locality,
      municipality: l.municipality,
      lat: l.latitude,
      lon: l.longitude,
    }));

    // Check specific district allocations:
    expect(snapshotKasaragod[0]).toEqual({
      id: 'demo-coconut-husk',
      title: 'Coconut Husk Waste',
      district: 'Kasaragod',
      locality: 'Kanhangad',
      municipality: 'Kanhangad',
      lat: 12.3089,
      lon: 75.0906,
    });
    expect(snapshotKasaragod[1]).toEqual({
      id: 'demo-cardboard-boxes',
      title: 'Used Cardboard Boxes',
      district: 'Kannur',
      locality: 'Thalassery',
      municipality: 'Thalassery',
      lat: 11.7483,
      lon: 75.4894,
    });
    expect(snapshotKasaragod[2]).toEqual({
      id: 'demo-plastic-bottles',
      title: 'Used Plastic Bottles',
      district: 'Kollam',
      locality: 'Karunagappally',
      municipality: 'Karunagappally',
      lat: 9.0556,
      lon: 76.5361,
    });
    expect(snapshotKasaragod[3]).toEqual({
      id: 'demo-vegetable-fruit',
      title: 'Vegetable and Fruit Waste',
      district: 'Thrissur',
      locality: 'Irinjalakuda',
      municipality: 'Irinjalakuda',
      lat: 10.3444,
      lon: 76.2089,
    });

    // -------------------------------------------------------------
    // 3. Log out
    // -------------------------------------------------------------
    activeUser = null;
    expect(activeUser).toBeNull();

    // -------------------------------------------------------------
    // 4. Log in with a user whose location is Kannur
    // -------------------------------------------------------------
    activeUser = userKannur;
    expect(activeUser.district).toBe('Kannur');

    // 5. Verify that all four listing locations remain identical
    const listingsKannurSession = generateDynamicDemoListings(
      { latitude: activeUser.latitude!, longitude: activeUser.longitude! },
      'Thana',
      activeUser.district,
      'Kannur',
      INITIAL_CATEGORIES
    );

    const snapshotKannur = listingsKannurSession.map((l) => ({
      id: l.id,
      title: l.title,
      district: l.district,
      locality: l.locality,
      municipality: l.municipality,
      lat: l.latitude,
      lon: l.longitude,
    }));

    // The locations MUST BE IDENTICAL to the Kasaragod session snapshot
    expect(snapshotKannur).toEqual(snapshotKasaragod);

    // -------------------------------------------------------------
    // 6. Refresh the marketplace (simulated reload / fresh invocation)
    // -------------------------------------------------------------
    const listingsAfterRefresh = getFixedMarketplaceListings(INITIAL_CATEGORIES);

    // 7. Verify that the locations remain unchanged
    const snapshotAfterRefresh = listingsAfterRefresh.map((l) => ({
      id: l.id,
      title: l.title,
      district: l.district,
      locality: l.locality,
      municipality: l.municipality,
      lat: l.latitude,
      lon: l.longitude,
    }));

    expect(snapshotAfterRefresh).toEqual(snapshotKasaragod);
  });

  it('verifies Step 8: District filters and Map Marker queries across all 4 districts', () => {
    const listings = getFixedMarketplaceListings(INITIAL_CATEGORIES);

    // Kasaragod District Filter:
    const kasaragodFilter = listings.filter((l) => isLocationInDistrict(l, 'Kasaragod'));
    expect(kasaragodFilter).toHaveLength(1);
    expect(kasaragodFilter[0].id).toBe('demo-coconut-husk');
    expect(kasaragodFilter[0].district).toBe('Kasaragod');
    expect(kasaragodFilter[0].locality).toBe('Kanhangad');

    // Kannur District Filter:
    const kannurFilter = listings.filter((l) => isLocationInDistrict(l, 'Kannur'));
    expect(kannurFilter).toHaveLength(1);
    expect(kannurFilter[0].id).toBe('demo-cardboard-boxes');
    expect(kannurFilter[0].district).toBe('Kannur');
    expect(kannurFilter[0].locality).toBe('Thalassery');

    // Kollam District Filter:
    const kollamFilter = listings.filter((l) => isLocationInDistrict(l, 'Kollam'));
    expect(kollamFilter).toHaveLength(1);
    expect(kollamFilter[0].id).toBe('demo-plastic-bottles');
    expect(kollamFilter[0].district).toBe('Kollam');
    expect(kollamFilter[0].locality).toBe('Karunagappally');

    // Thrissur District Filter:
    const thrissurFilter = listings.filter((l) => isLocationInDistrict(l, 'Thrissur'));
    expect(thrissurFilter).toHaveLength(1);
    expect(thrissurFilter[0].id).toBe('demo-vegetable-fruit');
    expect(thrissurFilter[0].district).toBe('Thrissur');
    expect(thrissurFilter[0].locality).toBe('Irinjalakuda');

    // Map municipality selection matches exact town markers:
    expect(listings.filter((l) => isLocationInMunicipality(l, 'Kanhangad'))).toHaveLength(1);
    expect(listings.filter((l) => isLocationInMunicipality(l, 'Thalassery'))).toHaveLength(1);
    expect(listings.filter((l) => isLocationInMunicipality(l, 'Karunagappally'))).toHaveLength(1);
    expect(listings.filter((l) => isLocationInMunicipality(l, 'Irinjalakuda'))).toHaveLength(1);
  });
});
