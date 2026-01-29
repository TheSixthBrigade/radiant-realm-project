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
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
