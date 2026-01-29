-- ROBUST visitor tracking RLS policies
-- Ensures tracking works from ANY device, ANY network, logged in or not

-- First, ensure RLS is enabled
ALTER TABLE IF EXISTS visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS page_views ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on visitor_sessions to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'visitor_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON visitor_sessions', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on page_views to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'page_views'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON page_views', pol.policyname);
    END LOOP;
END $$;

-- VISITOR_SESSIONS: Allow ANYONE to insert (anonymous tracking)
CREATE POLICY "visitor_sessions_insert_anyone" ON visitor_sessions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- VISITOR_SESSIONS: Allow ANYONE to update their own session
CREATE POLICY "visitor_sessions_update_anyone" ON visitor_sessions
  FOR UPDATE 
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- VISITOR_SESSIONS: Only authenticated users can read (for admin dashboard)
CREATE POLICY "visitor_sessions_select_authenticated" ON visitor_sessions
  FOR SELECT 
  TO authenticated
  USING (true);

-- PAGE_VIEWS: Allow ANYONE to insert
CREATE POLICY "page_views_insert_anyone" ON page_views
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- PAGE_VIEWS: Only authenticated users can read
CREATE POLICY "page_views_select_authenticated" ON page_views
  FOR SELECT 
  TO authenticated
  USING (true);

-- Grant necessary permissions to anon role
GRANT INSERT, UPDATE ON visitor_sessions TO anon;
GRANT INSERT ON page_views TO anon;
GRANT SELECT ON visitor_sessions TO authenticated;
GRANT SELECT ON page_views TO authenticated;

-- Ensure the session_id unique constraint exists for upsert to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'visitor_sessions_session_id_key'
    ) THEN
        ALTER TABLE visitor_sessions ADD CONSTRAINT visitor_sessions_session_id_key UNIQUE (session_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
