-- Bot Dashboard Tables
-- Stores Discord server configurations and command permissions

-- Discord Server Configurations
CREATE TABLE IF NOT EXISTS discord_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  guild_name TEXT,
  guild_icon TEXT,
  owner_id TEXT NOT NULL, -- Discord user ID who added the bot
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Linked Vectabase account
  member_count INTEGER DEFAULT 0,
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Bot Products (per server)
CREATE TABLE IF NOT EXISTS bot_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roblox_group_id TEXT NOT NULL,
  payhip_api_key TEXT NOT NULL,
  role_id TEXT,
  redemption_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);
-- Bot Whitelisted Users (per product)
CREATE TABLE IF NOT EXISTS bot_whitelisted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES bot_products(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  discord_username TEXT,
  roblox_id TEXT,
  roblox_username TEXT,
  license_key TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, discord_id)
);
-- Command Permissions (per server)
-- Defines which roles can use which commands
CREATE TABLE IF NOT EXISTS bot_command_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  command_name TEXT NOT NULL,
  allowed_role_ids TEXT[] DEFAULT '{}',
  require_admin BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, command_name)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_discord_servers_guild_id ON discord_servers(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_owner_id ON discord_servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_user_id ON discord_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_products_server_id ON bot_products(server_id);
CREATE INDEX IF NOT EXISTS idx_bot_whitelisted_users_product_id ON bot_whitelisted_users(product_id);
CREATE INDEX IF NOT EXISTS idx_bot_whitelisted_users_discord_id ON bot_whitelisted_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_bot_command_permissions_server_id ON bot_command_permissions(server_id);
-- Enable RLS
ALTER TABLE discord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_whitelisted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_command_permissions ENABLE ROW LEVEL SECURITY;
-- RLS Policies for discord_servers
CREATE POLICY "Users can view servers they own"
  ON discord_servers FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can update servers they own"
  ON discord_servers FOR UPDATE
  USING (user_id = auth.uid());
-- RLS Policies for bot_products
CREATE POLICY "Users can view products in their servers"
  ON bot_products FOR SELECT
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create products in their servers"
  ON bot_products FOR INSERT
  WITH CHECK (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update products in their servers"
  ON bot_products FOR UPDATE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete products in their servers"
  ON bot_products FOR DELETE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
-- RLS Policies for bot_whitelisted_users
CREATE POLICY "Users can view whitelisted users in their servers"
  ON bot_whitelisted_users FOR SELECT
  USING (
    product_id IN (
      SELECT bp.id FROM bot_products bp
      JOIN discord_servers ds ON bp.server_id = ds.id
      WHERE ds.user_id = auth.uid()
    )
  );
-- RLS Policies for bot_command_permissions
CREATE POLICY "Users can view permissions in their servers"
  ON bot_command_permissions FOR SELECT
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create permissions in their servers"
  ON bot_command_permissions FOR INSERT
  WITH CHECK (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update permissions in their servers"
  ON bot_command_permissions FOR UPDATE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );
-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_discord_servers_updated_at ON discord_servers;
CREATE TRIGGER update_discord_servers_updated_at
  BEFORE UPDATE ON discord_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_bot_products_updated_at ON bot_products;
CREATE TRIGGER update_bot_products_updated_at
  BEFORE UPDATE ON bot_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_bot_command_permissions_updated_at ON bot_command_permissions;
CREATE TRIGGER update_bot_command_permissions_updated_at
  BEFORE UPDATE ON bot_command_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
