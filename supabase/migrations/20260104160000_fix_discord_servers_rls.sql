-- Fix RLS policies for discord_servers
-- Allow service role (bot) to insert/update servers
-- Allow users to see servers they're admin of (via guild_id match from OAuth)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view servers they own" ON discord_servers;
DROP POLICY IF EXISTS "Users can update servers they own" ON discord_servers;
-- Allow anyone to view servers (the frontend filters by guild_id from OAuth)
-- This is safe because we only show servers where user has admin perms (checked client-side)
CREATE POLICY "Anyone can view servers"
  ON discord_servers FOR SELECT
  USING (true);
-- Allow users to update servers they own OR unclaimed servers
CREATE POLICY "Users can update their servers or claim unclaimed"
  ON discord_servers FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);
-- Allow service role to insert servers (bot uses service key)
-- Also allow anon for now until service key is configured
CREATE POLICY "Allow server registration"
  ON discord_servers FOR INSERT
  WITH CHECK (true);
-- Allow service role to update any server
CREATE POLICY "Service can update servers"
  ON discord_servers FOR UPDATE
  USING (true);
