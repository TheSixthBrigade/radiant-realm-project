-- PostgreSQL Encryption Functions
-- Uses pgcrypto extension for transparent encryption/decryption

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt a value using PGP symmetric encryption
-- The encryption key is passed as a parameter (from application layer)
CREATE OR REPLACE FUNCTION encrypt_value(
  plaintext TEXT,
  encryption_key TEXT
)
RETURNS BYTEA AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt a value using PGP symmetric encryption
CREATE OR REPLACE FUNCTION decrypt_value(
  encrypted_value BYTEA,
  encryption_key TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(encrypted_value, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (wrong key, corrupted data, etc.)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt and store a secret
CREATE OR REPLACE FUNCTION store_secret(
  p_key_name TEXT,
  p_value TEXT,
  p_encryption_key TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO secrets (key_name, encrypted_value, updated_at)
  VALUES (p_key_name, encrypt_value(p_value, p_encryption_key), NOW())
  ON CONFLICT (key_name) DO UPDATE
  SET encrypted_value = encrypt_value(p_value, p_encryption_key),
      updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve and decrypt a secret
CREATE OR REPLACE FUNCTION get_secret(
  p_key_name TEXT,
  p_encryption_key TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_encrypted BYTEA;
  v_decrypted TEXT;
BEGIN
  SELECT encrypted_value INTO v_encrypted
  FROM secrets
  WHERE key_name = p_key_name;
  
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update accessed_at timestamp
  UPDATE secrets SET accessed_at = NOW() WHERE key_name = p_key_name;
  
  RETURN decrypt_value(v_encrypted, p_encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a secret
CREATE OR REPLACE FUNCTION delete_secret(p_key_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM secrets WHERE key_name = p_key_name;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt Roblox API key for bot products
CREATE OR REPLACE FUNCTION encrypt_roblox_api_key(
  api_key TEXT,
  encryption_key TEXT
)
RETURNS BYTEA AS $$
BEGIN
  RETURN encrypt_value(api_key, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt Roblox API key
CREATE OR REPLACE FUNCTION decrypt_roblox_api_key(
  encrypted_key BYTEA,
  encryption_key TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN decrypt_value(encrypted_key, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store encrypted Roblox API key for a product
CREATE OR REPLACE FUNCTION store_roblox_api_key(
  p_product_id UUID,
  p_api_key TEXT,
  p_encryption_key TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bot_products
  SET roblox_api_key_encrypted = encrypt_value(p_api_key, p_encryption_key),
      updated_at = NOW()
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted Roblox API key for a product
CREATE OR REPLACE FUNCTION get_roblox_api_key(
  p_product_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_encrypted BYTEA;
BEGIN
  SELECT roblox_api_key_encrypted INTO v_encrypted
  FROM bot_products
  WHERE id = p_product_id;
  
  RETURN decrypt_value(v_encrypted, p_encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for bot products with masked API keys (for display)
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
    WHEN roblox_api_key_encrypted IS NOT NULL THEN '********'
    ELSE NULL
  END as roblox_api_key_masked,
  roblox_api_key_encrypted IS NOT NULL as has_roblox_api_key,
  created_at,
  updated_at
FROM bot_products;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details, p_ip_address)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION encrypt_value IS 'Encrypts a plaintext value using PGP symmetric encryption';
COMMENT ON FUNCTION decrypt_value IS 'Decrypts an encrypted value using PGP symmetric encryption';
COMMENT ON FUNCTION store_secret IS 'Stores an encrypted secret in the secrets table';
COMMENT ON FUNCTION get_secret IS 'Retrieves and decrypts a secret from the secrets table';
COMMENT ON FUNCTION create_audit_log IS 'Creates an audit log entry for security tracking';
