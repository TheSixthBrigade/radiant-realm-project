-- Fix visitor analytics RLS to avoid recursion with user_roles

-- Drop the problematic policies that reference user_roles
DROP POLICY IF EXISTS "Admins can read visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Admins can read page_views" ON page_views;
DROP POLICY IF EXISTS "Admins can read analytics_daily" ON analytics_daily;

-- Create simpler policies - allow all authenticated users to read (admin check done in app)
CREATE POLICY "Authenticated can read visitor_sessions" ON visitor_sessions
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated can read page_views" ON page_views
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated can read analytics_daily" ON analytics_daily
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
