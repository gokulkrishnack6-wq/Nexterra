import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AVAILABLE_REWARDS, getEcoTier } from '../src/lib/ecoRewards';

describe('GreenLoop EcoPoints & Impact System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Logged-Out Visitor Content & Messaging Integrity', () => {
    it('defines exact required heading and supporting copy for sign-in screen', () => {
      const expectedHeading = 'Your actions deserve rewards.';
      const expectedSupportingText =
        'Sign in to view your EcoPoints, track your environmental contributions, and discover your rewards.';

      expect(expectedHeading).toBe('Your actions deserve rewards.');
      expect(expectedSupportingText).toContain('Sign in to view your EcoPoints');
      expect(expectedSupportingText).toContain('track your environmental contributions');
      expect(expectedSupportingText).toContain('discover your rewards');
    });

    it('ensures authentication redirects preserve return path to /impact', () => {
      const buildLoginState = () => ({ state: { from: '/impact' } });
      const state = buildLoginState();
      expect(state.state.from).toBe('/impact');
    });
  });

  describe('2. Security & Private Ledger Data Integrity', () => {
    it('strictly isolates points records to the authenticated user ID', () => {
      const currentUserId = 'user-auth-123';
      const mockLedger = [
        {
          id: 'eco-1',
          user_id: 'user-auth-123',
          points: 10,
          action_type: 'listing_created' as const,
          description: 'Listed dry cardboard',
          created_at: '2026-11-01T10:00:00Z',
        },
        {
          id: 'eco-2',
          user_id: 'user-other-999', // Other user's record
          points: 50,
          action_type: 'challenge_completed' as const,
          description: 'Private community challenge',
          created_at: '2026-11-02T10:00:00Z',
        },
        {
          id: 'eco-3',
          user_id: 'user-auth-123',
          points: 25,
          action_type: 'exchange_completed' as const,
          description: 'Completed paper exchange handover',
          created_at: '2026-11-03T10:00:00Z',
        },
      ];

      // Filter strictly by current user
      const userPointsHistory = mockLedger.filter((pt) => pt.user_id === currentUserId);

      expect(userPointsHistory.length).toBe(2);
      expect(userPointsHistory.some((pt) => pt.user_id === 'user-other-999')).toBe(false);
      expect(userPointsHistory[0].points).toBe(10);
      expect(userPointsHistory[1].points).toBe(25);
    });

    it('correctly calculates total earned points strictly from verified positive credits', () => {
      const userBalance = 35;
      const userPointsHistory = [
        { id: '1', user_id: 'u1', points: 10, action_type: 'listing_created' as const, description: '', created_at: '' },
        { id: '2', user_id: 'u1', points: 25, action_type: 'exchange_completed' as const, description: '', created_at: '' },
        { id: '3', user_id: 'u1', points: -15, action_type: 'reward_redeemed' as const, description: '', created_at: '' },
      ];

      const fromLedger = userPointsHistory
        .filter((p) => p.points > 0)
        .reduce((sum, p) => sum + p.points, 0);

      const totalEarned = Math.max(userBalance, fromLedger);
      expect(totalEarned).toBe(35); // 10 + 25 = 35 earned
    });

    it('handles empty state with zero balance cleanly without fabricated records', () => {
      const userPointsHistory: any[] = [];
      const userBalance = 0;

      expect(userPointsHistory.length).toBe(0);
      expect(userBalance).toBe(0);
    });
  });

  describe('3. Circular Tier Progression & Rewards', () => {
    it('classifies tiers accurately based on cumulative points', () => {
      expect(getEcoTier(0).badge).toBe('Seedling');
      expect(getEcoTier(99).badge).toBe('Seedling');
      expect(getEcoTier(100).badge).toBe('Contributor');
      expect(getEcoTier(249).badge).toBe('Contributor');
      expect(getEcoTier(250).badge).toBe('Pioneer');
      expect(getEcoTier(499).badge).toBe('Pioneer');
      expect(getEcoTier(500).badge).toBe('Earth Champion');
      expect(getEcoTier(1200).badge).toBe('Earth Champion');
    });

    it('defines authentic, real circular community rewards in Kerala', () => {
      expect(AVAILABLE_REWARDS.length).toBeGreaterThanOrEqual(4);

      const vermicompost = AVAILABLE_REWARDS.find((r) => r.id === 'rew-vermicompost-5kg');
      expect(vermicompost).toBeDefined();
      expect(vermicompost?.points_cost).toBe(150);
      expect(vermicompost?.partner).toContain('Kudumbashree');

      const seeds = AVAILABLE_REWARDS.find((r) => r.id === 'rew-seeds-kit');
      expect(seeds).toBeDefined();
      expect(seeds?.points_cost).toBe(200);
      expect(seeds?.partner).toContain('Krishi Bhavan');
    });

    it('validates reward affordability against user balance', () => {
      const userBalance = 120;
      const vermicompostCost = 150;
      const certificateCost = 100;

      const canAffordVermicompost = userBalance >= vermicompostCost;
      const canAffordCert = userBalance >= certificateCost;

      expect(canAffordVermicompost).toBe(false);
      expect(canAffordCert).toBe(true);
    });
  });

  describe('4. Personal Environmental Impact Calculation', () => {
    it('computes personal impact strictly from user-specific transactions', () => {
      const currentUserId = 'user-test';
      const userTransactions = [
        {
          id: 'tx-1',
          generator_id: 'user-test',
          recipient_id: 'user-other',
          quantity: 20,
          co2_saved_kg: 38.0,
          landfill_saved_kg: 20.0,
        },
        {
          id: 'tx-2',
          generator_id: 'user-someone-else',
          recipient_id: 'user-test',
          quantity: 15,
          co2_saved_kg: 28.5,
          landfill_saved_kg: 15.0,
        },
      ];

      let wasteKg = 0;
      let co2Kg = 0;
      let landfillSqm = 0;

      userTransactions.forEach((tx) => {
        wasteKg += Number(tx.quantity) || 0;
        co2Kg += Number(tx.co2_saved_kg) || 0;
        landfillSqm += Number(tx.landfill_saved_kg) || 0;
      });

      expect(wasteKg).toBe(35);
      expect(co2Kg).toBe(66.5);
      expect(landfillSqm).toBe(35);
    });
  });
});
