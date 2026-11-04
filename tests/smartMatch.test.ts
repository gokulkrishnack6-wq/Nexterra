import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, calculateSmartMatches } from '../src/lib/smartMatch';
import { INITIAL_LISTINGS, INITIAL_PROFILES } from '../src/lib/mockData';

describe('Smart Matching Engine', () => {
  it('calculates geographic distance accurately between Kerala coordinates', () => {
    // Malappuram (10.9760, 76.2254) to Ottapalam (10.7719, 76.3814)
    const distance = calculateDistanceKm(10.9760, 76.2254, 10.7719, 76.3814);
    expect(distance).toBeGreaterThan(25);
    expect(distance).toBeLessThan(40);
  });

  it('prioritizes organic waste for farmer personas with high compatibility scores', () => {
    const farmer = INITIAL_PROFILES.find((p) => p.role === 'farmer')!;
    const matches = calculateSmartMatches(INITIAL_LISTINGS, farmer);

    expect(matches.length).toBeGreaterThan(0);
    // Highest ranked listing for farmer should be organic or agricultural waste
    const topMatch = matches[0];
    expect(topMatch.match_score).toBeGreaterThanOrEqual(70);
    expect(['cat-organic', 'cat-agricultural']).toContain(topMatch.listing.category_id);
  });

  it('prioritizes inorganic recyclables for recycler personas', () => {
    const recycler = INITIAL_PROFILES.find((p) => p.role === 'recycler')!;
    const matches = calculateSmartMatches(INITIAL_LISTINGS, recycler);

    expect(matches.length).toBeGreaterThan(0);
    const topMatch = matches[0];
    expect(['cat-paper', 'cat-plastics', 'cat-ewaste', 'cat-metals', 'cat-glass']).toContain(
      topMatch.listing.category_id
    );
  });
});
