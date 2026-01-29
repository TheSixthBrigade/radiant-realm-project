-- Create optimized replacement policies

-- PAGE_SECTIONS
DROP POLICY IF EXISTS "page_sections_owner" ON page_sections;
CREATE POLICY "page_sections_owner" ON page_sections FOR ALL USING (user_id = (select auth.uid()));

-- PRODUCT_COLLECTIONS
DROP POLICY IF EXISTS "product_collections_view" ON product_collections;
DROP POLICY IF EXISTS "product_collections_owner" ON product_collections;
CREATE POLICY "product_collections_view" ON product_collections FOR SELECT USING (is_visible = true OR user_id = (select auth.uid()));
CREATE POLICY "product_collections_owner" ON product_collections FOR ALL USING (user_id = (select auth.uid()));

-- COLLECTION_PRODUCTS
DROP POLICY IF EXISTS "collection_products_view" ON collection_products;
DROP POLICY IF EXISTS "collection_products_owner" ON collection_products;
CREATE POLICY "collection_products_view" ON collection_products FOR SELECT USING (
  EXISTS (SELECT 1 FROM product_collections pc WHERE pc.id = collection_products.collection_id AND (pc.is_visible = true OR pc.user_id = (select auth.uid())))
);
CREATE POLICY "collection_products_owner" ON collection_products FOR ALL USING (
  EXISTS (SELECT 1 FROM product_collections pc WHERE pc.id = collection_products.collection_id AND pc.user_id = (select auth.uid()))
);

-- WHITELIST_SYSTEMS
DROP POLICY IF EXISTS "whitelist_systems_owner" ON whitelist_systems;
CREATE POLICY "whitelist_systems_owner" ON whitelist_systems FOR ALL USING (user_id = (select auth.uid()));

-- WHITELIST_USERS
DROP POLICY IF EXISTS "whitelist_users_owner" ON whitelist_users;
CREATE POLICY "whitelist_users_owner" ON whitelist_users FOR ALL USING (
  EXISTS (SELECT 1 FROM whitelist_systems ws WHERE ws.id = whitelist_users.whitelist_id AND ws.user_id = (select auth.uid()))
);

-- API_KEYS
DROP POLICY IF EXISTS "api_keys_owner" ON api_keys;
CREATE POLICY "api_keys_owner" ON api_keys FOR ALL USING (user_id = (select auth.uid()));

-- EMAIL_QUEUE
DROP POLICY IF EXISTS "email_queue_deny" ON email_queue;
CREATE POLICY "email_queue_deny" ON email_queue FOR ALL USING (false);

-- NEWSLETTER_CAMPAIGNS
DROP POLICY IF EXISTS "newsletter_campaigns_access" ON newsletter_campaigns;
CREATE POLICY "newsletter_campaigns_access" ON newsletter_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = newsletter_campaigns.store_id AND stores.user_id = (select auth.uid()))
);;
