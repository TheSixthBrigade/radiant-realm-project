-- CLEANUP: Discord servers and other tables

-- ============================================
-- DISCORD_SERVERS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Anyone can view servers" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_select_own" ON discord_servers;
DROP POLICY IF EXISTS "Allow server registration" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_insert_auth" ON discord_servers;
DROP POLICY IF EXISTS "Authenticated users can update servers" ON discord_servers;
DROP POLICY IF EXISTS "Service can update servers" ON discord_servers;
DROP POLICY IF EXISTS "Users can update their servers or claim unclaimed" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_update_own" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_select" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_insert" ON discord_servers;
DROP POLICY IF EXISTS "discord_servers_update" ON discord_servers;

-- Create clean policies
CREATE POLICY "discord_servers_select" ON discord_servers FOR SELECT USING (true);
CREATE POLICY "discord_servers_insert" ON discord_servers FOR INSERT WITH CHECK (true);
CREATE POLICY "discord_servers_update" ON discord_servers FOR UPDATE USING (true);

-- ============================================
-- ANNOUNCEMENTS - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Everyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "announcements_select" ON announcements;
DROP POLICY IF EXISTS "announcements_manage" ON announcements;

-- Create clean policies (public can view active, admins can manage all)
CREATE POLICY "announcements_public_view" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "announcements_admin_manage" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);;
