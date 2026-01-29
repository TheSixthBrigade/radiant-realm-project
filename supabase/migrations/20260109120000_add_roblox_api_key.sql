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

-- Create encryption key storage (stored as a secret, not in the table)
-- The actual key should be set as a Supabase secret: ROBLOX_API_ENCRYPTION_KEY

-- Function to encrypt Roblox API key
CREATE OR REPLACE FUNCTION encrypt_roblox_api_key(api_key TEXT)
RETURNS BYTEA AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from environment (set as Supabase secret)
  encryption_key := current_setting('app.roblox_encryption_key', true);
  
  -- If no key set, use a default (should be overridden in production)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'vectabase_roblox_key_2026_secure';
  END IF;
  
  RETURN pgp_sym_encrypt(api_key, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt Roblox API key
CREATE OR REPLACE FUNCTION decrypt_roblox_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from environment
  encryption_key := current_setting('app.roblox_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'vectabase_roblox_key_2026_secure';
  END IF;
  
  RETURN pgp_sym_decrypt(encrypted_key, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return null if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view that shows masked API keys for display
CREATE OR REPLACE VIEW bot_products_display AS
SELECT 
  id,
  server_id,
  name,
  roblox_group_id,
  payhip_api_key,
  role_id,
  redemption_message,
  CASE 
    WHEN roblox_api_key_encrypted IS NOT NULL THEN 
      CONCAT(LEFT(decrypt_roblox_api_key(roblox_api_key_encrypted), 8), '...', RIGHT(decrypt_roblox_api_key(roblox_api_key_encrypted), 4))
    ELSE NULL
  END as roblox_api_key_masked,
  roblox_api_key_encrypted IS NOT NULL as has_roblox_api_key,
  created_at,
  updated_at
FROM bot_products;

-- Grant access to the view
GRANT SELECT ON bot_products_display TO authenticated;
GRANT SELECT ON bot_products_display TO anon;

-- Comment explaining the Roblox API key usage
COMMENT ON COLUMN bot_products.roblox_api_key_encrypted IS 'Encrypted Roblox Open Cloud API key. Only give "groups" permission when creating the key at https://create.roblox.com/credentials';
COMMENT ON COLUMN profiles.default_roblox_api_key_encrypted IS 'User default encrypted Roblox API key for new products';


-- RPC function to encrypt and store Roblox API key
CREATE OR REPLACE FUNCTION encrypt_and_store_roblox_key(
  p_product_name TEXT,
  p_server_id UUID,
  p_api_key TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bot_products
  SET roblox_api_key_encrypted = encrypt_roblox_api_key(p_api_key)
  WHERE name = p_product_name AND server_id = p_server_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION encrypt_and_store_roblox_key TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_and_store_roblox_key TO service_role;

-- RPC function to get decrypted Roblox API key (only for service role)
CREATE OR REPLACE FUNCTION get_roblox_api_key(p_product_id UUID)
RETURNS TEXT AS $$
DECLARE
  encrypted_key BYTEA;
BEGIN
  SELECT roblox_api_key_encrypted INTO encrypted_key
  FROM bot_products
  WHERE id = p_product_id;
  
  RETURN decrypt_roblox_api_key(encrypted_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can decrypt keys
GRANT EXECUTE ON FUNCTION get_roblox_api_key TO service_role;

-- Function to save user's default Roblox API key
CREATE OR REPLACE FUNCTION save_default_roblox_api_key(p_api_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET default_roblox_api_key_encrypted = encrypt_roblox_api_key(p_api_key)
  WHERE user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_default_roblox_api_key TO authenticated;

-- Function to check if user has a default Roblox API key
CREATE OR REPLACE FUNCTION has_default_roblox_api_key()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND default_roblox_api_key_encrypted IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_default_roblox_api_key TO authenticated;

-- Function to copy default key to a product
CREATE OR REPLACE FUNCTION use_default_roblox_api_key(p_product_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  default_key BYTEA;
BEGIN
  -- Get user's default key
  SELECT default_roblox_api_key_encrypted INTO default_key
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF default_key IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Copy to product
  UPDATE bot_products
  SET roblox_api_key_encrypted = default_key
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION use_default_roblox_api_key TO authenticated;
