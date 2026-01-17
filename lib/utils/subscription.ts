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
    credits: parseInt(process.env.STANDARD_TIER_CREDITS ?? String(defaultPricing.standard.credits)),
    price: parseInt(process.env.STANDARD_TIER_MONTHLY_PRICE ?? String(defaultPricing.standard.price)),
    billingCycle: (process.env.STANDARD_TIER_BILLING_CYCLE as 'monthly' | 'yearly') || (defaultPricing.standard.billing_cycle as 'monthly' | 'yearly'),
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
