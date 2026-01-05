// Stripe Product and Price IDs for Luzon Developer API
// These are LIVE mode IDs - do not use in test environments

export const STRIPE_PRODUCTS = {
  // Subscription Products
  pro: {
    productId: 'prod_TjeDKtzK4RCvf4',
    priceId: 'price_1SmAwqCGUDkaRpEdosoZAZFJ',
    name: 'Luzon Developer API - Pro',
    price: 700, // £7.00 in pence
    currency: 'gbp',
    interval: 'month',
    features: {
      obfuscationsPerDay: 20,
      whitelistLimit: 100,
      rateLimit: 30, // requests per minute
    },
  },
  pro_plus: {
    productId: 'prod_TjeDaRPo0gOPf6',
    priceId: 'price_1SmAxKCGUDkaRpEdSnkP9fpE',
    name: 'Luzon Developer API - Pro+',
    price: 1400, // £14.00 in pence
    currency: 'gbp',
    interval: 'month',
    features: {
      obfuscationsPerDay: -1, // unlimited
      whitelistLimit: 500,
      rateLimit: 60,
    },
  },
  enterprise: {
    productId: 'prod_TjeDy26Q8AnWaO',
    priceId: 'price_1SmAwqCGUDkaRpEdRuJoYIcE',
    name: 'Luzon Developer API - Enterprise',
    price: 2500, // £25.00 in pence
    currency: 'gbp',
    interval: 'month',
    features: {
      obfuscationsPerDay: -1, // unlimited
      whitelistLimit: -1, // unlimited
      rateLimit: 120,
    },
  },
  
  // One-time purchase
  credits: {
    productId: 'prod_TjeEdYFcDT7jfs',
    priceId: 'price_1SmAxKCGUDkaRpEdqaP4xhXU',
    name: 'Luzon Obfuscation Credits',
    price: 100, // £1.00 per credit in pence
    currency: 'gbp',
  },
} as const;

// Free tier (no Stripe product needed)
export const FREE_TIER = {
  name: 'Free',
  price: 0,
  features: {
    obfuscationsPerWeek: 1,
    whitelistLimit: 10,
    rateLimit: 10,
  },
} as const;

// Helper to get price ID by tier
export function getPriceIdByTier(tier: 'pro' | 'pro_plus' | 'enterprise'): string {
  return STRIPE_PRODUCTS[tier].priceId;
}

// Helper to get product ID by tier
export function getProductIdByTier(tier: 'pro' | 'pro_plus' | 'enterprise'): string {
  return STRIPE_PRODUCTS[tier].productId;
}

// Tier limits for API enforcement
export const TIER_LIMITS = {
  free: {
    obfuscation: { count: 1, period: 'week' as const },
    whitelist: 10,
    rateLimit: 10,
  },
  pro: {
    obfuscation: { count: 20, period: 'day' as const },
    whitelist: 100,
    rateLimit: 30,
  },
  pro_plus: {
    obfuscation: { count: -1, period: 'day' as const }, // -1 = unlimited
    whitelist: 500,
    rateLimit: 60,
  },
  enterprise: {
    obfuscation: { count: -1, period: 'day' as const },
    whitelist: -1, // unlimited
    rateLimit: 120,
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;
