-- Fix RLS policy for discord_servers to allow bot inserts
-- The bot needs to register servers when it joins them

-- Drop existing insert policies that might be blocking
DROP POLICY IF EXISTS "discord_servers_insert_policy" ON discord_servers;
DROP POLICY IF EXISTS "Users can insert their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Bot can insert servers" ON discord_servers;
DROP POLICY IF EXISTS "Allow bot to insert servers" ON discord_servers;
DROP POLICY IF EXISTS "Service role can insert servers" ON discord_servers;

-- Create a permissive insert policy for the service role (used by the bot)
-- The bot uses the service role key which bypasses RLS, but we need to ensure
-- the anon key can also insert for server registration
CREATE POLICY "Allow server registration" ON discord_servers
  FOR INSERT
  WITH CHECK (true);

-- Also ensure update policy exists for the bot to update server info
DROP POLICY IF EXISTS "discord_servers_update_policy" ON discord_servers;
DROP POLICY IF EXISTS "Users can update their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Bot can update servers" ON discord_servers;

CREATE POLICY "Allow server updates" ON discord_servers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Ensure select policy allows reading servers
DROP POLICY IF EXISTS "discord_servers_select_policy" ON discord_servers;
DROP POLICY IF EXISTS "Users can view their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Anyone can view servers" ON discord_servers;

CREATE POLICY "Allow server reads" ON discord_servers
  FOR SELECT
  USING (true);

-- Ensure delete policy exists
DROP POLICY IF EXISTS "discord_servers_delete_policy" ON discord_servers;
DROP POLICY IF EXISTS "Users can delete their own servers" ON discord_servers;

CREATE POLICY "Allow server deletes" ON discord_servers
  FOR DELETE
  USING (true);
