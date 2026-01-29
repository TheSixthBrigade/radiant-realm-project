-- Add Discord refresh token columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS discord_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS discord_token_expires_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.discord_refresh_token IS 'Discord OAuth refresh token for auto-refreshing access tokens';
COMMENT ON COLUMN profiles.discord_token_expires_at IS 'When the Discord access token expires';
