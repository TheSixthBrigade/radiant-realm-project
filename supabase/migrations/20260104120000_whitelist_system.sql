-- Vectabase Whitelist System Tables
-- This creates the database structure for the whitelist management system

-- Whitelist Systems (one per product)
CREATE TABLE IF NOT EXISTS whitelist_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Whitelist Users (users in each whitelist)
CREATE TABLE IF NOT EXISTS whitelist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whitelist_systems_user_id ON whitelist_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_users_whitelist_id ON whitelist_users(whitelist_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_users_license_key ON whitelist_users(license_key);
CREATE INDEX IF NOT EXISTS idx_whitelist_users_discord_id ON whitelist_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_users_roblox_id ON whitelist_users(roblox_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_users_status ON whitelist_users(status);
-- Enable RLS
ALTER TABLE whitelist_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_users ENABLE ROW LEVEL SECURITY;
-- RLS Policies for whitelist_systems
CREATE POLICY "Users can view their own whitelist systems"
  ON whitelist_systems FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own whitelist systems"
  ON whitelist_systems FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own whitelist systems"
  ON whitelist_systems FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own whitelist systems"
  ON whitelist_systems FOR DELETE
  USING (auth.uid() = user_id);
-- RLS Policies for whitelist_users
CREATE POLICY "Users can view users in their whitelists"
  ON whitelist_users FOR SELECT
  USING (
    whitelist_id IN (
      SELECT id FROM whitelist_systems WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can add users to their whitelists"
  ON whitelist_users FOR INSERT
  WITH CHECK (
    whitelist_id IN (
      SELECT id FROM whitelist_systems WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update users in their whitelists"
  ON whitelist_users FOR UPDATE
  USING (
    whitelist_id IN (
      SELECT id FROM whitelist_systems WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete users from their whitelists"
  ON whitelist_users FOR DELETE
  USING (
    whitelist_id IN (
      SELECT id FROM whitelist_systems WHERE user_id = auth.uid()
    )
  );
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_whitelist_systems_updated_at ON whitelist_systems;
CREATE TRIGGER update_whitelist_systems_updated_at
  BEFORE UPDATE ON whitelist_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_whitelist_users_updated_at ON whitelist_users;
CREATE TRIGGER update_whitelist_users_updated_at
  BEFORE UPDATE ON whitelist_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- API Key table for external access (Discord bot, etc.)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{"whitelist": true, "obfuscator": true}'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);
