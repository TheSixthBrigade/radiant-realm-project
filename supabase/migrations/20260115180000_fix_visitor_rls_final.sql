-- FINAL FIX: Allow anonymous visitor tracking
-- Error was: "new row violates row-level security policy for table visitor_sessions"

-- Disable RLS temporarily to fix policies
ALTER TABLE visitor_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on visitor_sessions
DROP POLICY IF EXISTS "visitor_sessions_insert_anyone" ON visitor_sessions;
DROP POLICY IF EXISTS "visitor_sessions_update_anyone" ON visitor_sessions;
DROP POLICY IF EXISTS "visitor_sessions_select_authenticated" ON visitor_sessions;
DROP POLICY IF EXISTS "Anyone can insert visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Authenticated can read visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "anon_insert_visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "anon_update_visitor_sessions" ON visitor_sessions;

-- Drop ALL policies on page_views
DROP POLICY IF EXISTS "page_views_insert_anyone" ON page_views;
DROP POLICY IF EXISTS "page_views_select_authenticated" ON page_views;
DROP POLICY IF EXISTS "Anyone can insert page_views" ON page_views;
DROP POLICY IF EXISTS "Authenticated can read page_views" ON page_views;

-- Re-enable RLS
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Create simple permissive policies for visitor_sessions
-- INSERT: Allow everyone (anon and authenticated)
CREATE POLICY "vs_insert" ON visitor_sessions
  FOR INSERT 
  WITH CHECK (true);

-- UPDATE: Allow everyone
CREATE POLICY "vs_update" ON visitor_sessions
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- SELECT: Allow authenticated users only (for admin dashboard)
CREATE POLICY "vs_select" ON visitor_sessions
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Create simple permissive policies for page_views
CREATE POLICY "pv_insert" ON page_views
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "pv_select" ON page_views
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Grant permissions to anon role explicitly
GRANT INSERT, UPDATE ON visitor_sessions TO anon;
GRANT INSERT ON page_views TO anon;
GRANT SELECT ON visitor_sessions TO authenticated;
GRANT SELECT ON page_views TO authenticated;
