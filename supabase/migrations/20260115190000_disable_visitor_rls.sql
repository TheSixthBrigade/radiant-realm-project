-- NUCLEAR OPTION: Disable RLS entirely for visitor tracking tables
-- These tables only contain anonymous analytics data, no sensitive info

-- Completely disable RLS on visitor_sessions
ALTER TABLE visitor_sessions DISABLE ROW LEVEL SECURITY;

-- Completely disable RLS on page_views  
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;

-- Grant full access to both anon and authenticated
GRANT ALL ON visitor_sessions TO anon;
GRANT ALL ON visitor_sessions TO authenticated;
GRANT ALL ON page_views TO anon;
GRANT ALL ON page_views TO authenticated;

-- Also grant usage on the sequence if it exists
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
