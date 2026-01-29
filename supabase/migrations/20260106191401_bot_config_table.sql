-- Bot Configuration Table
-- Stores all bot configuration securely in Supabase

CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access (bot uses service role key)
CREATE POLICY "Service role only" ON bot_config
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default config values (placeholders - set real values in production)
INSERT INTO bot_config (key, value, description, is_secret) VALUES
  ('DISCORD_TOKEN', 'YOUR_DISCORD_BOT_TOKEN_HERE', 'Discord bot token', true),
  ('DISCORD_CLIENT_ID', 'YOUR_DISCORD_CLIENT_ID_HERE', 'Discord application client ID', false),
  ('ROBLOX_API_KEY', 'YOUR_ROBLOX_API_KEY_HERE', 'Roblox Open Cloud API key', true),
  ('ROBLOX_GROUP_ID', 'YOUR_ROBLOX_GROUP_ID_HERE', 'Roblox group ID', false)
ON CONFLICT (key) DO NOTHING;
