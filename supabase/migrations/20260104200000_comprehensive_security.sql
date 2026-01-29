-- =====================================================
-- COMPREHENSIVE SECURITY MIGRATION v2
-- Vectabase - January 4, 2026
-- =====================================================

-- 1. PROFILES TABLE SECURITY
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. PRODUCTS TABLE SECURITY
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Sellers can manage own products" ON products;
DROP POLICY IF EXISTS "products_select_public" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_own" ON products FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "products_update_own" ON products FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "products_delete_own" ON products FOR DELETE USING (auth.uid() = creator_id);

-- 3. DISCORD SERVERS TABLE SECURITY
DROP POLICY IF EXISTS "discord_servers_select" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_insert" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_update" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_delete" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_select_own" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_insert_auth" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_update_own" ON discord_servers;

ALTER TABLE discord_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_servers_select_own" ON discord_servers FOR SELECT USING (
    user_id = auth.uid() OR
    owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "discord_servers_insert_auth" ON discord_servers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "discord_servers_update_own" ON discord_servers FOR UPDATE USING (
    user_id = auth.uid() OR
    owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
);

-- 4. BOT PRODUCTS TABLE SECURITY
DROP POLICY IF EXISTS "bot_products_select" ON bot_products;
DROP POLICY IF EXISTS "bot_products_insert" ON bot_products;
DROP POLICY IF EXISTS "bot_products_update" ON bot_products;
DROP POLICY IF EXISTS "bot_products_delete" ON bot_products;
DROP POLICY IF EXISTS "bot_products_select_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_insert_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_update_own" ON bot_products;
DROP POLICY IF EXISTS "bot_products_delete_own" ON bot_products;

ALTER TABLE bot_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_products_select_own" ON bot_products FOR SELECT USING (
    server_id IN (
        SELECT id FROM discord_servers 
        WHERE user_id = auth.uid() OR
        owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "bot_products_insert_own" ON bot_products FOR INSERT WITH CHECK (
    server_id IN (
        SELECT id FROM discord_servers 
        WHERE user_id = auth.uid() OR
        owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "bot_products_update_own" ON bot_products FOR UPDATE USING (
    server_id IN (
        SELECT id FROM discord_servers 
        WHERE user_id = auth.uid() OR
        owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "bot_products_delete_own" ON bot_products FOR DELETE USING (
    server_id IN (
        SELECT id FROM discord_servers 
        WHERE user_id = auth.uid() OR
        owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);

-- 5. BOT WHITELISTED USERS TABLE SECURITY
DROP POLICY IF EXISTS "bot_whitelisted_users_select" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_insert" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_delete" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_select_own" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_insert_service" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "bot_whitelisted_users_delete_own" ON bot_whitelisted_users;

ALTER TABLE bot_whitelisted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_whitelisted_users_select_own" ON bot_whitelisted_users FOR SELECT USING (
    product_id IN (
        SELECT bp.id FROM bot_products bp
        JOIN discord_servers ds ON bp.server_id = ds.id
        WHERE ds.user_id = auth.uid() OR
        ds.owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "bot_whitelisted_users_insert_service" ON bot_whitelisted_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bot_whitelisted_users_delete_own" ON bot_whitelisted_users FOR DELETE USING (
    product_id IN (
        SELECT bp.id FROM bot_products bp
        JOIN discord_servers ds ON bp.server_id = ds.id
        WHERE ds.user_id = auth.uid() OR
        ds.owner_id IN (SELECT discord_id FROM profiles WHERE user_id = auth.uid())
    )
);

-- 6. AUDIT LOGGING TABLE
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_no_public_access" ON security_audit_log;
CREATE POLICY "audit_log_no_public_access" ON security_audit_log FOR ALL USING (false);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_user_id ON discord_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_owner_id ON discord_servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_guild_id ON discord_servers(guild_id);
CREATE INDEX IF NOT EXISTS idx_bot_products_server_id ON bot_products(server_id);
CREATE INDEX IF NOT EXISTS idx_bot_whitelisted_users_product_id ON bot_whitelisted_users(product_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
