export const TIERS = {
  FREE: 'free',
  STANDARD: 'standard',
} as const;

export interface TierConfig {
  name: string;
  credits: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  [TIERS.FREE]: {
    name: 'Free',
    credits: 0,
    price: 0,
    billingCycle: 'monthly',
  },
  [TIERS.STANDARD]: {
    name: 'Standard',
    credits: Number(process.env.STANDARD_TIER_CREDITS) || 8000,
    price: Number(process.env.STANDARD_TIER_MONTHLY_PRICE) || 41,
    billingCycle: (process.env.STANDARD_TIER_BILLING_CYCLE as 'monthly' | 'yearly') || 'yearly',
  },
};

export function getTierConfig(tier: string): TierConfig {
  return TIER_CONFIGS[tier] || TIER_CONFIGS[TIERS.FREE];
}
