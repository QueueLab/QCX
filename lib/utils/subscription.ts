export const TIERS = {
  FREE: 'free',
  STANDARD: 'standard',
} as const;

export type Tier = typeof TIERS[keyof typeof TIERS];

export interface TierConfig {
  name: string;
  credits: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  priceId?: string;
}

import pricingConfig from '../../config/pricing.json';

const defaultPricing = pricingConfig.tiers;

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  [TIERS.FREE]: {
    name: defaultPricing.free.name,
    credits: defaultPricing.free.credits,
    price: defaultPricing.free.price,
    billingCycle: 'monthly',
  },
  [TIERS.STANDARD]: {
    name: defaultPricing.standard.name,
    credits: (() => {
      const val = parseInt(process.env.STANDARD_TIER_CREDITS ?? '');
      return !isNaN(val) && val > 0 ? val : defaultPricing.standard.credits;
    })(),
    price: (() => {
      const val = parseInt(process.env.STANDARD_TIER_MONTHLY_PRICE ?? '');
      return !isNaN(val) && val > 0 ? val : defaultPricing.standard.price;
    })(),
    billingCycle: (() => {
      const val = process.env.STANDARD_TIER_BILLING_CYCLE;
      return val === 'monthly' || val === 'yearly' ? val : (defaultPricing.standard.billing_cycle as 'monthly' | 'yearly');
    })(),
    priceId: process.env.STANDARD_TIER_PRICE_ID,
  },
};

export function getTierConfig(tier: Tier): TierConfig {
  return TIER_CONFIGS[tier];
}

export function parseTier(input: string): Tier {
  if (Object.values(TIERS).includes(input as Tier)) {
    return input as Tier;
  }
  return TIERS.FREE;
}
