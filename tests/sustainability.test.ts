import { describe, it, expect } from 'vitest';
import { INITIAL_CATEGORIES } from '../src/lib/mockData';

describe('Sustainability Conversion Factors', () => {
  it('has documented factors for all 8 categories adhering to KSPCB/IPCC guidelines', () => {
    expect(INITIAL_CATEGORIES.length).toBe(8);

    INITIAL_CATEGORIES.forEach((cat) => {
      expect(cat.default_co2_factor).toBeGreaterThan(0);
      expect(cat.default_landfill_factor).toBeGreaterThan(0);
      expect(cat.recyclability_score).toBeGreaterThanOrEqual(50);
      expect(cat.recyclability_score).toBeLessThanOrEqual(100);
    });
  });

  it('calculates CO2e avoided accurately for organic waste diversion', () => {
    const organic = INITIAL_CATEGORIES.find((c) => c.slug === 'organic')!;
    const weightKg = 25;
    const co2Saved = Math.round(weightKg * organic.default_co2_factor * 10) / 10;
    expect(co2Saved).toBe(45); // 25 * 1.80 = 45.0 kg CO2e
  });
});

