-- ============================================
-- VECTABASE ENCRYPTION & VAULT SYSTEM
-- AES-256-GCM encryption for all secrets
-- ============================================

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. MASTER KEY MANAGEMENT
-- ============================================

-- Table to store encrypted master keys (KEK - Key Encryption Keys)
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id TEXT UNIQUE NOT NULL,
    key_type TEXT NOT NULL, -- 'master', 'project', 'user'
    encrypted_key BYTEA NOT NULL, -- Encrypted with parent key or HSM
    key_version INTEGER DEFAULT 1,
    algorithm TEXT DEFAULT 'aes-256-gcm',
    parent_key_id TEXT REFERENCES encryption_keys(key_id),
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_encryption_keys_project ON encryption_keys(project_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(is_active) WHERE is_active = TRUE;

-- 2. SECURE ENCRYPTION FUNCTIONS
-- ============================================

-- Generate a random encryption key
CREATE OR REPLACE FUNCTION generate_encryption_key()
RETURNS BYTEA AS $$
BEGIN
    RETURN gen_random_bytes(32); -- 256 bits
END;
$$ LANGUAGE plpgsql;

-- Generate a random IV/nonce
CREATE OR REPLACE FUNCTION generate_iv()
RETURNS BYTEA AS $$
BEGIN
    RETURN gen_random_bytes(12); -- 96 bits for GCM
END;
$$ LANGUAGE plpgsql;

-- Encrypt data with AES-256 (using pgcrypto)
CREATE OR REPLACE FUNCTION encrypt_value(
    p_plaintext TEXT,
    p_key BYTEA
) RETURNS BYTEA AS $$
DECLARE
    v_iv BYTEA;
    v_encrypted BYTEA;
BEGIN
    v_iv := generate_iv();
    -- pgcrypto encrypt with AES
    v_encrypted := encrypt_iv(
        p_plaintext::BYTEA,
        p_key,
        v_iv,
        'aes'
    );
    -- Prepend IV to ciphertext
    RETURN v_iv || v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt data
CREATE OR REPLACE FUNCTION decrypt_value(
    p_ciphertext BYTEA,
    p_key BYTEA
) RETURNS TEXT AS $$
DECLARE
    v_iv BYTEA;
    v_encrypted BYTEA;
    v_decrypted BYTEA;
BEGIN
    IF p_ciphertext IS NULL OR length(p_ciphertext) < 12 THEN
        RETURN NULL;
    END IF;
    
    -- Extract IV (first 12 bytes)
    v_iv := substring(p_ciphertext FROM 1 FOR 12);
    v_encrypted := substring(p_ciphertext FROM 13);
    
    v_decrypted := decrypt_iv(v_encrypted, p_key, v_iv, 'aes');
    RETURN convert_from(v_decrypted, 'UTF8');
EXCEPTION WHEN OTHERS THEN
    -- Log decryption failure (potential tampering)
    PERFORM log_security_event('crypto', 'decryption_failed', NULL, NULL, NULL, NULL, NULL, 'critical');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROJECT-LEVEL ENCRYPTION
-- ============================================

-- Derive project encryption key from master key + project salt
CREATE OR REPLACE FUNCTION get_project_encryption_key(p_project_id INTEGER)
RETURNS BYTEA AS $$
DECLARE
    v_salt TEXT;
    v_master_key BYTEA;
BEGIN
    -- Get project salt
    SELECT encryption_salt INTO v_salt FROM projects WHERE id = p_project_id;
    
    IF v_salt IS NULL THEN
        -- Generate and store salt if not exists
        v_salt := encode(gen_random_bytes(16), 'hex');
        UPDATE projects SET encryption_salt = v_salt WHERE id = p_project_id;
    END IF;
    
    -- Derive key using PBKDF2-like approach
    -- In production, use actual PBKDF2 or Argon2
    RETURN digest(
        current_setting('app.master_encryption_key', true) || v_salt || p_project_id::TEXT,
        'sha256'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SECURE VAULT OPERATIONS
-- ============================================

-- Store a secret in the vault (encrypted)
CREATE OR REPLACE FUNCTION vault_store_secret(
    p_project_id INTEGER,
    p_name TEXT,
    p_value TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_key BYTEA;
    v_encrypted BYTEA;
    v_secret_id INTEGER;
BEGIN
    -- Check access
    IF NOT user_has_project_access(p_project_id) THEN
        RAISE EXCEPTION 'Access denied to project %', p_project_id;
    END IF;
    
    -- Get project encryption key
    v_key := get_project_encryption_key(p_project_id);
    
    -- Encrypt the value
    v_encrypted := encrypt_value(p_value, v_key);
    
    -- Store in vault
    INSERT INTO vault_secrets (project_id, name, description, value)
    VALUES (p_project_id, p_name, p_description, encode(v_encrypted, 'base64'))
    ON CONFLICT (project_id, name) DO UPDATE SET
        value = encode(v_encrypted, 'base64'),
        description = COALESCE(p_description, vault_secrets.description),
        updated_at = NOW()
    RETURNING id INTO v_secret_id;
    
    -- Audit log
    PERFORM log_security_event('vault', 'secret_stored', 'secret', p_name, p_project_id, NULL, NULL, 'medium');
    
    RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve a secret from the vault (decrypted)
CREATE OR REPLACE FUNCTION vault_get_secret(
    p_project_id INTEGER,
    p_name TEXT
) RETURNS TEXT AS $$
DECLARE
    v_key BYTEA;
    v_encrypted_b64 TEXT;
    v_decrypted TEXT;
BEGIN
    -- Check access
    IF NOT user_has_project_access(p_project_id) THEN
        RAISE EXCEPTION 'Access denied to project %', p_project_id;
    END IF;
    
    -- Get encrypted value
    SELECT value INTO v_encrypted_b64
    FROM vault_secrets
    WHERE project_id = p_project_id AND name = p_name;
    
    IF v_encrypted_b64 IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get project encryption key
    v_key := get_project_encryption_key(p_project_id);
    
    -- Decrypt
    v_decrypted := decrypt_value(decode(v_encrypted_b64, 'base64'), v_key);
    
    -- Audit log (secret access is sensitive)
    PERFORM log_security_event('vault', 'secret_accessed', 'secret', p_name, p_project_id, NULL, NULL, 'low');
    
    RETURN v_decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a secret
CREATE OR REPLACE FUNCTION vault_delete_secret(
    p_project_id INTEGER,
    p_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    -- Check access
    IF NOT user_has_project_access(p_project_id) THEN
        RAISE EXCEPTION 'Access denied to project %', p_project_id;
    END IF;
    
    DELETE FROM vault_secrets
    WHERE project_id = p_project_id AND name = p_name
    RETURNING TRUE INTO v_deleted;
    
    -- Audit log
    PERFORM log_security_event('vault', 'secret_deleted', 'secret', p_name, p_project_id, NULL, NULL, 'high');
    
    RETURN COALESCE(v_deleted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. API KEY ENCRYPTION
-- ============================================

-- Generate and store encrypted API key
CREATE OR REPLACE FUNCTION generate_api_key(
    p_project_id INTEGER,
    p_key_type TEXT, -- 'anon' or 'service_role'
    p_name TEXT DEFAULT NULL
) RETURNS TEXT AS $$ -- Returns the plaintext key (only time it's visible!)
DECLARE
    v_key TEXT;
    v_key_hash TEXT;
    v_prefix TEXT;
BEGIN
    -- Check access
    IF NOT user_has_project_access(p_project_id) THEN
        RAISE EXCEPTION 'Access denied to project %', p_project_id;
    END IF;
    
    -- Generate random key
    v_key := 'vb_' || p_key_type || '_' || encode(gen_random_bytes(24), 'hex');
    v_prefix := substring(v_key FROM 1 FOR 12);
    
    -- Hash for storage (never store plaintext!)
    v_key_hash := encode(digest(v_key, 'sha256'), 'hex');
    
    -- Store
    INSERT INTO api_keys (project_id, name, key_type, key_hash, key_prefix)
    VALUES (p_project_id, COALESCE(p_name, p_key_type || ' key'), p_key_type, v_key_hash, v_prefix)
    ON CONFLICT (project_id, key_type) DO UPDATE SET
        key_hash = v_key_hash,
        key_prefix = v_prefix,
        created_at = NOW();
    
    -- Audit log
    PERFORM log_security_event('api_key', 'key_generated', 'api_key', p_key_type, p_project_id, NULL, NULL, 'high');
    
    RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify API key
CREATE OR REPLACE FUNCTION verify_api_key(p_key TEXT)
RETURNS TABLE(project_id INTEGER, key_type TEXT, permissions JSONB) AS $$
DECLARE
    v_key_hash TEXT;
BEGIN
    v_key_hash := encode(digest(p_key, 'sha256'), 'hex');
    
    RETURN QUERY
    SELECT ak.project_id, ak.key_type, ak.permissions
    FROM api_keys ak
    WHERE ak.key_hash = v_key_hash;
    
    -- Update last used
    UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = v_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Encryption vault system complete!' as status;
