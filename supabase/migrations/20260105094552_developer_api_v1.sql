-- Developer API v1 Tables
-- Handles API keys, subscriptions, obfuscation, products, and whitelisting

-- API Keys for developers
CREATE TABLE IF NOT EXISTS developer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_developer_name ON developer_api_keys(developer_id, name);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON developer_api_keys(api_key);

-- Subscription tiers: free, pro, pro_plus, enterprise
CREATE TABLE IF NOT EXISTS developer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'pro_plus', 'enterprise')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pay-per-use obfuscation credits (£1 each)
CREATE TABLE IF NOT EXISTS obfuscation_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track obfuscation usage per period
CREATE TABLE IF NOT EXISTS obfuscation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('subscription', 'credit'))
);

CREATE INDEX IF NOT EXISTS idx_obfuscation_usage_lookup ON obfuscation_usage(developer_id, period_start);

-- Developer products linked to Roblox groups
CREATE TABLE IF NOT EXISTS developer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  roblox_group_id BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One product per group per developer
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_developer_group ON developer_products(developer_id, roblox_group_id);
CREATE INDEX IF NOT EXISTS idx_products_group ON developer_products(roblox_group_id);

-- Whitelist entries for products
CREATE TABLE IF NOT EXISTS whitelist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
  roblox_user_id BIGINT NOT NULL,
  discord_id TEXT NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One entry per user per product (upsert behavior)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whitelist_product_user ON whitelist_entries(product_id, roblox_user_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_product ON whitelist_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_roblox ON whitelist_entries(roblox_user_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_expiry ON whitelist_entries(expiry_date);

-- API request logs for usage dashboard
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_developer ON api_request_logs(developer_id, created_at DESC);

-- Auto-create subscription and credits rows for new users
CREATE OR REPLACE FUNCTION create_developer_defaults()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO developer_subscriptions (developer_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (developer_id) DO NOTHING;
  
  INSERT INTO obfuscation_credits (developer_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (developer_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_dev_defaults ON auth.users;
CREATE TRIGGER on_auth_user_created_dev_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_developer_defaults();

-- Backfill existing users
INSERT INTO developer_subscriptions (developer_id, tier)
SELECT id, 'free' FROM auth.users
ON CONFLICT (developer_id) DO NOTHING;

INSERT INTO obfuscation_credits (developer_id, credits)
SELECT id, 0 FROM auth.users
ON CONFLICT (developer_id) DO NOTHING;;
