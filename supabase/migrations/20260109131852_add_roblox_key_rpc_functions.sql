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

GRANT EXECUTE ON FUNCTION use_default_roblox_api_key TO authenticated;;
