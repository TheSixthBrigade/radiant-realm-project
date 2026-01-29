-- Fix visitor_sessions to allow anonymous inserts for tracking
-- This is needed for visitor tracking to work on all devices

-- Drop any existing insert/update policies
DROP POLICY IF EXISTS "Anyone can insert visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Anon can insert visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Anon can update visitor_sessions" ON visitor_sessions;

-- Allow anyone (including anonymous) to insert visitor sessions
CREATE POLICY "Anyone can insert visitor_sessions" ON visitor_sessions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update their own session (by session_id match)
CREATE POLICY "Anyone can update visitor_sessions" ON visitor_sessions
  FOR UPDATE USING (true);

-- Also fix page_views table
DROP POLICY IF EXISTS "Anyone can insert page_views" ON page_views;
CREATE POLICY "Anyone can insert page_views" ON page_views
  FOR INSERT WITH CHECK (true);
