-- Vectabase Local PostgreSQL Schema
-- Version: 1.0.0
-- Migrated from Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  discord_refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_discord_id ON users(discord_id);

-- Sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  is_creator BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  social_links JSONB DEFAULT '{}',
  website_settings JSONB DEFAULT '{}',
  -- Stripe Connect fields (encrypted)
  stripe_connect_account_id TEXT,
  stripe_connect_status TEXT DEFAULT 'not_connected',
  -- PayPal fields
  paypal_email TEXT,
  paypal_merchant_id TEXT,
  preferred_payment_method TEXT DEFAULT 'stripe',
  -- Roblox API key (encrypted)
  default_roblox_api_key_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_display_name ON profiles(display_name);

-- ============================================
-- PRODUCTS AND SALES
-- ============================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  tags TEXT[],
  thumbnail_url TEXT,
  images TEXT[],
  file_url TEXT,
  file_urls JSONB DEFAULT '[]',
  downloads INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_published ON products(is_published);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee DECIMAL(10,2) DEFAULT 0,
  seller_amount DECIMAL(10,2),
  stripe_payment_id TEXT,
  paypal_order_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_buyer_id ON sales(buyer_id);
CREATE INDEX idx_sales_seller_id ON sales(seller_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT true,
  custom_domain TEXT,
  stripe_connect_account_id TEXT,
  store_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_stores_slug ON stores(store_slug);

-- Add foreign key from products to stores
ALTER TABLE products ADD CONSTRAINT fk_products_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;


-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  store_id UUID REFERENCES stores(id),
  product_id UUID REFERENCES products(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  seller_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_buyer_id ON payment_transactions(buyer_id);
CREATE INDEX idx_payment_transactions_seller_id ON payment_transactions(seller_id);
CREATE INDEX idx_payment_transactions_product_id ON payment_transactions(product_id);

-- Store customizations table
CREATE TABLE IF NOT EXISTS store_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  theme_colors JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  custom_css TEXT,
  layout_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_customizations_store_id ON store_customizations(store_id);

-- ============================================
-- WHITELIST SYSTEM TABLES
-- ============================================

-- Whitelist systems (one per product)
CREATE TABLE IF NOT EXISTS whitelist_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whitelist_systems_user_id ON whitelist_systems(user_id);

-- Whitelist users
CREATE TABLE IF NOT EXISTS whitelist_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whitelist_id UUID NOT NULL REFERENCES whitelist_systems(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  discord_id TEXT,
  roblox_id TEXT,
  license_key TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'banned')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whitelist_users_whitelist_id ON whitelist_users(whitelist_id);
CREATE INDEX idx_whitelist_users_license_key ON whitelist_users(license_key);
CREATE INDEX idx_whitelist_users_discord_id ON whitelist_users(discord_id);
CREATE INDEX idx_whitelist_users_roblox_id ON whitelist_users(roblox_id);
CREATE INDEX idx_whitelist_users_status ON whitelist_users(status);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{"whitelist": true, "obfuscator": true}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ============================================
-- BOT DASHBOARD TABLES
-- ============================================

-- Discord servers
CREATE TABLE IF NOT EXISTS discord_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id TEXT NOT NULL UNIQUE,
  guild_name TEXT,
  guild_icon TEXT,
  owner_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 0,
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_servers_guild_id ON discord_servers(guild_id);
CREATE INDEX idx_discord_servers_owner_id ON discord_servers(owner_id);
CREATE INDEX idx_discord_servers_user_id ON discord_servers(user_id);

-- Bot products (per server)
CREATE TABLE IF NOT EXISTS bot_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roblox_group_id TEXT NOT NULL,
  payhip_api_key TEXT,
  role_id TEXT,
  redemption_message TEXT,
  roblox_api_key_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);

CREATE INDEX idx_bot_products_server_id ON bot_products(server_id);

-- Bot whitelisted users (per product)
CREATE TABLE IF NOT EXISTS bot_whitelisted_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES bot_products(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  discord_username TEXT,
  roblox_id TEXT,
  roblox_username TEXT,
  license_key TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, discord_id)
);

CREATE INDEX idx_bot_whitelisted_users_product_id ON bot_whitelisted_users(product_id);
CREATE INDEX idx_bot_whitelisted_users_discord_id ON bot_whitelisted_users(discord_id);

-- Bot command permissions
CREATE TABLE IF NOT EXISTS bot_command_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  command_name TEXT NOT NULL,
  allowed_role_ids TEXT[] DEFAULT '{}',
  require_admin BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, command_name)
);

CREATE INDEX idx_bot_command_permissions_server_id ON bot_command_permissions(server_id);


-- ============================================
-- DEVELOPER API TABLES
-- ============================================

-- Developer API keys
CREATE TABLE IF NOT EXISTS developer_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX idx_dev_api_keys_developer_name ON developer_api_keys(developer_id, name);
CREATE INDEX idx_dev_api_keys_key ON developer_api_keys(api_key);

-- Developer subscriptions
CREATE TABLE IF NOT EXISTS developer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'pro_plus', 'enterprise')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Obfuscation credits
CREATE TABLE IF NOT EXISTS obfuscation_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Obfuscation usage tracking
CREATE TABLE IF NOT EXISTS obfuscation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('subscription', 'credit'))
);

CREATE INDEX idx_obfuscation_usage_lookup ON obfuscation_usage(developer_id, period_start);

-- Developer products (linked to Roblox groups)
CREATE TABLE IF NOT EXISTS developer_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  roblox_group_id BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dev_products_developer_group ON developer_products(developer_id, roblox_group_id);
CREATE INDEX idx_dev_products_group ON developer_products(roblox_group_id);

-- Whitelist entries for developer products
CREATE TABLE IF NOT EXISTS whitelist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
  roblox_user_id BIGINT NOT NULL,
  discord_id TEXT NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_whitelist_product_user ON whitelist_entries(product_id, roblox_user_id);
CREATE INDEX idx_whitelist_product ON whitelist_entries(product_id);
CREATE INDEX idx_whitelist_roblox ON whitelist_entries(roblox_user_id);
CREATE INDEX idx_whitelist_expiry ON whitelist_entries(expiry_date);

-- API request logs
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_logs_developer ON api_request_logs(developer_id, created_at DESC);

-- ============================================
-- SYSTEM TABLES
-- ============================================

-- Secrets table (encrypted key-value store)
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_name TEXT UNIQUE NOT NULL,
  encrypted_value BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_secrets_key_name ON secrets(key_name);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================
-- ADDITIONAL TABLES
-- ============================================

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  border_color TEXT DEFAULT '#3b82f6',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_user_id ON announcements(user_id);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_user_id ON collections(user_id);

-- Collection products junction table
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE(creator_id, email)
);

CREATE INDEX idx_newsletter_creator ON newsletter_subscribers(creator_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_customizations_updated_at BEFORE UPDATE ON store_customizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whitelist_systems_updated_at BEFORE UPDATE ON whitelist_systems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whitelist_users_updated_at BEFORE UPDATE ON whitelist_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discord_servers_updated_at BEFORE UPDATE ON discord_servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_products_updated_at BEFORE UPDATE ON bot_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_command_permissions_updated_at BEFORE UPDATE ON bot_command_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developer_subscriptions_updated_at BEFORE UPDATE ON developer_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developer_products_updated_at BEFORE UPDATE ON developer_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whitelist_entries_updated_at BEFORE UPDATE ON whitelist_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment product downloads
CREATE OR REPLACE FUNCTION increment_downloads(p_product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products SET downloads = downloads + 1 WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create default profile for new user
CREATE OR REPLACE FUNCTION create_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO developer_subscriptions (developer_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (developer_id) DO NOTHING;
  
  INSERT INTO obfuscation_credits (developer_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (developer_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_profile();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User accounts - replaces Supabase auth.users';
COMMENT ON TABLE sessions IS 'Active user sessions with refresh tokens';
COMMENT ON TABLE secrets IS 'Encrypted key-value store for API keys and tokens';
COMMENT ON TABLE audit_logs IS 'Security audit trail for sensitive operations';
COMMENT ON COLUMN bot_products.roblox_api_key_encrypted IS 'Encrypted Roblox Open Cloud API key';
COMMENT ON COLUMN profiles.default_roblox_api_key_encrypted IS 'User default encrypted Roblox API key';
