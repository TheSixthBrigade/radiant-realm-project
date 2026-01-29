-- Add Discord linking support to profiles
-- Allows users to link their Discord account and claim servers

-- Add discord_id column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
-- Create index for discord_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON profiles(discord_id);
-- Update RLS policy to allow service role to update discord_servers
-- This is needed for the bot to register servers

-- Allow service role full access to discord_servers (for bot operations)
CREATE POLICY "Service role can manage all servers"
  ON discord_servers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Allow users to claim unclaimed servers (where user_id is null)
CREATE POLICY "Users can claim unclaimed servers"
  ON discord_servers FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Allow insert for service role (bot registering new servers)
CREATE POLICY "Service role can insert servers"
  ON discord_servers FOR INSERT
  TO service_role
  WITH CHECK (true);
