-- CLEANUP: Remove all duplicate/old RLS policies and create clean optimized ones

-- ============================================
-- BOT_PRODUCTS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Anyone can view products" ON bot_products;
DROP POLICY IF EXISTS "Anyone can insert products" ON bot_products;
DROP POLICY IF EXISTS "Anyone can update products" ON bot_products;
DROP POLICY IF EXISTS "Anyone can delete products" ON bot_products;
DROP POLICY IF EXISTS "bot_products_select_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_insert_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_update_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_delete_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_select" ON bot_products;
DROP POLICY IF EXISTS "bot_products_insert" ON bot_products;
DROP POLICY IF EXISTS "bot_products_update" ON bot_products;
DROP POLICY IF EXISTS "bot_products_delete" ON bot_products;

-- Create single clean policies
CREATE POLICY "bot_products_all" ON bot_products FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- BOT_WHITELISTED_USERS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on bot_whitelisted_users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_select_own" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_insert_service" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_delete_own" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_select" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_insert" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_update" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_delete" ON bot_whitelisted_users;

-- Create single clean policy
CREATE POLICY "bot_whitelisted_users_all" ON bot_whitelisted_users FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- BOT_COMMAND_PERMISSIONS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Anyone can manage permissions" ON bot_command_permissions;
DROP POLICY IF EXISTS "Anyone can view permissions" ON bot_command_permissions;
DROP POLICY IF EXISTS "bot_command_permissions_all" ON bot_command_permissions;

-- Create single clean policy
CREATE POLICY "bot_command_permissions_all" ON bot_command_permissions FOR ALL USING (true) WITH CHECK (true);;
