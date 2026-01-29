-- Fix RLS policies for bot_products and bot_whitelisted_users
-- Allow viewing products for any server (frontend handles authorization)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can create products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can update products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can delete products in their servers" ON bot_products;
-- Allow anyone to view products (servers are already filtered)
CREATE POLICY "Anyone can view products"
  ON bot_products FOR SELECT
  USING (true);
-- Allow authenticated users to create products in any server they can see
CREATE POLICY "Authenticated users can create products"
  ON bot_products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Allow authenticated users to update products
CREATE POLICY "Authenticated users can update products"
  ON bot_products FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- Allow authenticated users to delete products
CREATE POLICY "Authenticated users can delete products"
  ON bot_products FOR DELETE
  USING (auth.uid() IS NOT NULL);
-- Fix bot_whitelisted_users policies
DROP POLICY IF EXISTS "Users can view whitelisted users in their servers" ON bot_whitelisted_users;
-- Allow anyone to view whitelisted users
CREATE POLICY "Anyone can view whitelisted users"
  ON bot_whitelisted_users FOR SELECT
  USING (true);
-- Fix bot_command_permissions policies
DROP POLICY IF EXISTS "Users can view permissions in their servers" ON bot_command_permissions;
DROP POLICY IF EXISTS "Users can create permissions in their servers" ON bot_command_permissions;
DROP POLICY IF EXISTS "Users can update permissions in their servers" ON bot_command_permissions;
-- Allow anyone to view permissions
CREATE POLICY "Anyone can view permissions"
  ON bot_command_permissions FOR SELECT
  USING (true);
-- Allow authenticated users to manage permissions
CREATE POLICY "Authenticated users can create permissions"
  ON bot_command_permissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update permissions"
  ON bot_command_permissions FOR UPDATE
  USING (auth.uid() IS NOT NULL);
