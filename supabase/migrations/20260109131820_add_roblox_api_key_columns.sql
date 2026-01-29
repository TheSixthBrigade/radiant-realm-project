-- Add Roblox API Key support for bot products
-- Keys are encrypted using pgcrypto for security

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted Roblox API key column to bot_products
ALTER TABLE bot_products 
ADD COLUMN IF NOT EXISTS roblox_api_key_encrypted BYTEA;

-- Add default Roblox API key to profiles (for user's default key)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_roblox_api_key_encrypted BYTEA;

-- Comment explaining the Roblox API key usage
COMMENT ON COLUMN bot_products.roblox_api_key_encrypted IS 'Encrypted Roblox Open Cloud API key. Only give groups permission when creating the key at https://create.roblox.com/credentials';
COMMENT ON COLUMN profiles.default_roblox_api_key_encrypted IS 'User default encrypted Roblox API key for new products';;
