// Shared types for Developer API v1

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus' | 'enterprise';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  priceGbp: number;
  obfuscationLimit: number; // -1 = unlimited
  obfuscationPeriod: 'week' | 'day';
  whitelistLimit: number; // -1 = unlimited
  rateLimit: number; // requests per minute
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    priceGbp: 0,
    obfuscationLimit: 1,
    obfuscationPeriod: 'week',
    whitelistLimit: 10,
    rateLimit: 10
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceGbp: 7,
    obfuscationLimit: 20,
    obfuscationPeriod: 'day',
    whitelistLimit: 100,
    rateLimit: 30
  },
  pro_plus: {
    id: 'pro_plus',
    name: 'Pro+',
    priceGbp: 14,
    obfuscationLimit: -1,
    obfuscationPeriod: 'day',
    whitelistLimit: 500,
    rateLimit: 60
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceGbp: 25,
    obfuscationLimit: -1,
    obfuscationPeriod: 'day',
    whitelistLimit: -1,
    rateLimit: 120
  }
};

export const CREDIT_PRICE_GBP = 1;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  request_id: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_EXPIRY: 'INVALID_EXPIRY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_GROUP: 'DUPLICATE_GROUP',
  RATE_LIMITED: 'RATE_LIMITED',
  OBFUSCATION_LIMIT: 'OBFUSCATION_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export interface DeveloperContext {
  developerId: string;
  apiKey: string;
  tier: SubscriptionTier;
  rateLimit: number;
}

export interface Product {
  id: string;
  developer_id: string;
  product_name: string;
  roblox_group_id: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhitelistEntry {
  id: string;
  product_id: string;
  roblox_user_id: number;
  discord_id: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface ObfuscateRequest {
  code: string;
}

export interface ObfuscateResponse {
  obfuscated_code: string;
  usage: {
    used: number;
    limit: number | 'unlimited';
    period: 'week' | 'day';
    credits_remaining: number;
  };
}

export interface CreateProductRequest {
  product_name: string;
  roblox_group_id: number;
  description?: string;
}

export interface AddWhitelistRequest {
  product_id: string;
  roblox_user_id: number;
  discord_id: string;
  expiry_date: string;
}

export interface VerifyRequest {
  roblox_user_id: number;
  roblox_group_id: number;
}

export interface VerifyResponse {
  whitelisted: boolean;
  expiry_date?: string;
}
