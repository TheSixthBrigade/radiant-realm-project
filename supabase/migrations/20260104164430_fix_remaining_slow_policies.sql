-- Fix remaining slow RLS policies (auth_rls_initplan warnings)

-- STORES - drop old slow ones
DROP POLICY IF EXISTS "Users can create their own store" ON stores;
DROP POLICY IF EXISTS "Users can update their own store" ON stores;

-- PAYMENT_TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;

-- FOLLOWS
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- NEWSLETTER_CAMPAIGNS
DROP POLICY IF EXISTS "Store owners can view their campaigns" ON newsletter_campaigns;
DROP POLICY IF EXISTS "Store owners can create campaigns" ON newsletter_campaigns;

-- EMAIL_QUEUE
DROP POLICY IF EXISTS "Service role can manage email queue" ON email_queue;

-- PAGE_SECTIONS
DROP POLICY IF EXISTS "Users can view their own page sections" ON page_sections;
DROP POLICY IF EXISTS "Users can insert their own page sections" ON page_sections;
DROP POLICY IF EXISTS "Users can update their own page sections" ON page_sections;
DROP POLICY IF EXISTS "Users can delete their own page sections" ON page_sections;

-- PRODUCT_COLLECTIONS
DROP POLICY IF EXISTS "Users can view their own collections" ON product_collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON product_collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON product_collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON product_collections;

-- COLLECTION_PRODUCTS
DROP POLICY IF EXISTS "Users can view collection products for their collections" ON collection_products;
DROP POLICY IF EXISTS "Users can insert collection products for their collections" ON collection_products;
DROP POLICY IF EXISTS "Users can delete collection products for their collections" ON collection_products;

-- WHITELIST_SYSTEMS
DROP POLICY IF EXISTS "Users can view their own whitelist systems" ON whitelist_systems;
DROP POLICY IF EXISTS "Users can create their own whitelist systems" ON whitelist_systems;
DROP POLICY IF EXISTS "Users can update their own whitelist systems" ON whitelist_systems;
DROP POLICY IF EXISTS "Users can delete their own whitelist systems" ON whitelist_systems;

-- WHITELIST_USERS
DROP POLICY IF EXISTS "Users can view users in their whitelists" ON whitelist_users;
DROP POLICY IF EXISTS "Users can add users to their whitelists" ON whitelist_users;
DROP POLICY IF EXISTS "Users can update users in their whitelists" ON whitelist_users;
DROP POLICY IF EXISTS "Users can delete users from their whitelists" ON whitelist_users;

-- API_KEYS
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;;
