-- CLEANUP: Newsletter and store_products duplicates

-- ============================================
-- NEWSLETTER_SUBSCRIBERS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Store owners can view their subscribers" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletters" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon newsletter subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon view subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_select" ON newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_insert" ON newsletter_subscribers;

-- Create clean policies
CREATE POLICY "newsletter_subscribers_view" ON newsletter_subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = newsletter_subscribers.store_id AND stores.user_id = (select auth.uid()))
);
CREATE POLICY "newsletter_subscribers_add" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- ============================================
-- STORE_PRODUCTS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Store owners can manage their products" ON store_products;
DROP POLICY IF EXISTS "Store products are viewable by everyone" ON store_products;
DROP POLICY IF EXISTS "store_products_select" ON store_products;
DROP POLICY IF EXISTS "store_products_manage" ON store_products;

-- Create clean policies
CREATE POLICY "store_products_view" ON store_products FOR SELECT USING (true);
CREATE POLICY "store_products_owner_manage" ON store_products FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_products.store_id AND stores.user_id = (select auth.uid()))
);

-- ============================================
-- PLATFORM_FEES_OWED - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Sellers can view their own fees" ON platform_fees_owed;
DROP POLICY IF EXISTS "Platform can manage all fees" ON platform_fees_owed;
DROP POLICY IF EXISTS "platform_fees_owed_select" ON platform_fees_owed;

-- Create clean policy
CREATE POLICY "platform_fees_owed_access" ON platform_fees_owed FOR SELECT USING (
  seller_id = (select auth.uid()) OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);;
