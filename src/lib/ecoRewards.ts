import {
  Sprout,
  Leaf,
  PackageCheck,
  Award,
} from 'lucide-react';

export interface EcoReward {
  id: string;
  title: string;
  partner: string;
  category: 'gardening' | 'agriculture' | 'certificate' | 'marketplace';
  points_cost: number;
  description: string;
  redemption_method: string;
  icon: any;
}

export const AVAILABLE_REWARDS: EcoReward[] = [
  {
    id: 'rew-vermicompost-5kg',
    title: '5 kg Organic Vermicompost Bag',
    partner: 'KAU & Kudumbashree Compost Hubs',
    category: 'gardening',
    points_cost: 150,
    description: 'Enriched organic microbial compost produced from decentralized vegetable discards in Kerala.',
    redemption_method: 'Collect at any registered Haritha Karma Sena or Kudumbashree collection centre.',
    icon: Sprout,
  },
  {
    id: 'rew-seeds-kit',
    title: 'Indigenous Vegetable & Herb Seed Kit',
    partner: 'Krishi Bhavan & Organic Kerala Trust',
    category: 'agriculture',
    points_cost: 200,
    description: 'Non-hybrid heirloom seeds: yardlong beans, bird’s eye chilli, Malabar spinach & amaranth.',
    redemption_method: 'Digital voucher redeemable at partner Krishi Bhavans and local agro-clinics.',
    icon: Leaf,
  },
  {
    id: 'rew-coir-pith',
    title: '5 kg Washed Coir Pith Block (Low EC)',
    partner: 'Coirfed & Kerala Agro Hubs',
    category: 'gardening',
    points_cost: 250,
    description: 'Premium moisture-retaining organic coir peat block derived from Kerala coconut husk value chains.',
    redemption_method: 'Voucher valid across authorized Coirfed and district nursery distribution points.',
    icon: PackageCheck,
  },
  {
    id: 'rew-haritha-cert',
    title: 'Haritha Sahayi Digital Diversion Certificate',
    partner: 'GreenLoop Civic Network',
    category: 'certificate',
    points_cost: 100,
    description: 'Official verified certificate of cumulative personal landfill diversion and carbon reduction.',
    redemption_method: 'Instant digital certificate download with unique verification hash.',
    icon: Award,
  },
];

export const getEcoTier = (points: number) => {
  if (points >= 500) {
    return {
      name: 'Kerala Earth Champion',
      min: 500,
      next: 1000,
      badge: 'Earth Champion',
      color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
    };
  }
  if (points >= 250) {
    return {
      name: 'Circular Pioneer',
      min: 250,
      next: 500,
      badge: 'Pioneer',
      color: 'text-teal-700 bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300'
    };
  }
  if (points >= 100) {
    return {
      name: 'Green Contributor',
      min: 100,
      next: 250,
      badge: 'Contributor',
      color: 'text-primary bg-secondary-container border-primary/20'
    };
  }
  return {
    name: 'Eco Seedling',
    min: 0,
    next: 100,
    badge: 'Seedling',
    color: 'text-amber-800 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
  };
};
