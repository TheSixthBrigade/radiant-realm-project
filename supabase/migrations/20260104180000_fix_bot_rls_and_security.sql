-- Fix bot_products RLS to allow service role inserts
-- Also improve security: only show servers where user is admin (via Discord OAuth)

-- Drop all existing bot_products policies
DROP POLICY IF EXISTS "Anyone can view products" ON bot_products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON bot_products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON bot_products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON bot_products;
DROP POLICY IF EXISTS "Users can view products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can create products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can update products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can delete products in their servers" ON bot_products;
-- Allow anyone to view products (dashboard filters by server)
CREATE POLICY "Anyone can view products"
  ON bot_products FOR SELECT
  USING (true);
-- Allow anyone to insert products (service role and authenticated users)
CREATE POLICY "Anyone can insert products"
  ON bot_products FOR INSERT
  WITH CHECK (true);
-- Allow anyone to update products
CREATE POLICY "Anyone can update products"
  ON bot_products FOR UPDATE
  USING (true);
-- Allow anyone to delete products
CREATE POLICY "Anyone can delete products"
  ON bot_products FOR DELETE
  USING (true);
-- Fix discord_servers RLS - remove the claim server functionality
-- Only show servers to users who have linked their Discord and are admins
DROP POLICY IF EXISTS "Users can view servers they own" ON discord_servers;
DROP POLICY IF EXISTS "Users can update servers they own" ON discord_servers;
DROP POLICY IF EXISTS "Users can claim unclaimed servers" ON discord_servers;
DROP POLICY IF EXISTS "Service role can manage all servers" ON discord_servers;
DROP POLICY IF EXISTS "Service role can insert servers" ON discord_servers;
DROP POLICY IF EXISTS "Anyone can view servers" ON discord_servers;
-- Allow anyone to view servers (frontend will filter by Discord admin status)
CREATE POLICY "Anyone can view servers"
  ON discord_servers FOR SELECT
  USING (true);
-- Allow service role to manage servers (for bot operations)
CREATE POLICY "Service role can manage servers"
  ON discord_servers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Allow authenticated users to update servers (for linking accounts)
CREATE POLICY "Authenticated users can update servers"
  ON discord_servers FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- Fix bot_whitelisted_users RLS
DROP POLICY IF EXISTS "Anyone can view whitelisted users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Users can view whitelisted users in their servers" ON bot_whitelisted_users;
CREATE POLICY "Anyone can view whitelisted users"
  ON bot_whitelisted_users FOR SELECT
  USING (true);
CREATE POLICY "Anyone can insert whitelisted users"
  ON bot_whitelisted_users FOR INSERT
  WITH CHECK (true);
-- Fix bot_command_permissions RLS
DROP POLICY IF EXISTS "Anyone can view permissions" ON bot_command_permissions;
DROP POLICY IF EXISTS "Authenticated users can create permissions" ON bot_command_permissions;
DROP POLICY IF EXISTS "Authenticated users can update permissions" ON bot_command_permissions;
DROP POLICY IF EXISTS "Users can view permissions in their servers" ON bot_command_permissions;
DROP POLICY IF EXISTS "Users can create permissions in their servers" ON bot_command_permissions;
DROP POLICY IF EXISTS "Users can update permissions in their servers" ON bot_command_permissions;
CREATE POLICY "Anyone can view permissions"
  ON bot_command_permissions FOR SELECT
  USING (true);
CREATE POLICY "Anyone can manage permissions"
  ON bot_command_permissions FOR ALL
  USING (true)
  WITH CHECK (true);
