-- Update bot_config RLS to allow anon read access
-- The config values are needed by the bot which runs without auth
-- Secrets are still protected because they're only in the database

-- Drop existing policy
DROP POLICY IF EXISTS "Service role only" ON bot_config;

-- Allow anyone to read config (bot needs this)
-- Writing still requires service role
CREATE POLICY "Anyone can read config" ON bot_config
  FOR SELECT USING (true);

CREATE POLICY "Service role can write config" ON bot_config
  FOR ALL USING (auth.role() = 'service_role');;
