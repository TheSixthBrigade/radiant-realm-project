-- Enable RLS
ALTER TABLE discord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_whitelisted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_command_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_servers
DROP POLICY IF EXISTS "Users can view servers they own" ON discord_servers;
CREATE POLICY "Users can view servers they own"
  ON discord_servers FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update servers they own" ON discord_servers;
CREATE POLICY "Users can update servers they own"
  ON discord_servers FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for bot_products
DROP POLICY IF EXISTS "Users can view products in their servers" ON bot_products;
CREATE POLICY "Users can view products in their servers"
  ON bot_products FOR SELECT
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create products in their servers" ON bot_products;
CREATE POLICY "Users can create products in their servers"
  ON bot_products FOR INSERT
  WITH CHECK (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update products in their servers" ON bot_products;
CREATE POLICY "Users can update products in their servers"
  ON bot_products FOR UPDATE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete products in their servers" ON bot_products;
CREATE POLICY "Users can delete products in their servers"
  ON bot_products FOR DELETE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for bot_whitelisted_users
DROP POLICY IF EXISTS "Users can view whitelisted users in their servers" ON bot_whitelisted_users;
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
DROP POLICY IF EXISTS "Users can view permissions in their servers" ON bot_command_permissions;
CREATE POLICY "Users can view permissions in their servers"
  ON bot_command_permissions FOR SELECT
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create permissions in their servers" ON bot_command_permissions;
CREATE POLICY "Users can create permissions in their servers"
  ON bot_command_permissions FOR INSERT
  WITH CHECK (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update permissions in their servers" ON bot_command_permissions;
CREATE POLICY "Users can update permissions in their servers"
  ON bot_command_permissions FOR UPDATE
  USING (
    server_id IN (
      SELECT id FROM discord_servers WHERE user_id = auth.uid()
    )
  );;
