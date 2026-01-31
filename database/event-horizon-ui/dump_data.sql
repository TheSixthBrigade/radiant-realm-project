-- ============================================
-- VECTABASE COMPLETE DATABASE DUMP
-- Generated: 2026-01-31
-- Deploy to: db.vectabase.com
-- ============================================
-- 
-- SCP Command:
--   scp database/event-horizon-ui/dump_data.sql root@51.210.97.81:/tmp/
--
-- Then SSH and run:
--   ssh root@51.210.97.81
--   PGPASSWORD='your-super-secret-and-long-postgres-password' psql -U postgres -d postgres -f /tmp/dump_data.sql
--
-- ============================================

-- Drop existing tables for clean slate
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS failed_logins CASCADE;
DROP TABLE IF EXISTS encryption_keys CASCADE;
DROP TABLE IF EXISTS sso_configurations CASCADE;
DROP TABLE IF EXISTS vault_secrets CASCADE;
DROP TABLE IF EXISTS edge_function_files CASCADE;
DROP TABLE IF EXISTS edge_functions CASCADE;
DROP TABLE IF EXISTS provider_configs CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS storage_buckets CASCADE;
DROP TABLE IF EXISTS storage_objects CASCADE;

-- Drop schemas
DROP SCHEMA IF EXISTS p1 CASCADE;
DROP SCHEMA IF EXISTS p2 CASCADE;
DROP SCHEMA IF EXISTS p3 CASCADE;
DROP SCHEMA IF EXISTS p4 CASCADE;
DROP SCHEMA IF EXISTS p5 CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- SCHEMA FROM schema.sql
-- ============================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    identity_id TEXT UNIQUE,
    provider TEXT DEFAULT 'google',
    password_hash TEXT,  -- For SSO email authentication
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_identity_id ON users(identity_id);

-- Permissions table (controls who can access the platform)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    access_level TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-authorize the owners
INSERT INTO permissions (email, access_level) VALUES 
    ('thecheesemanatyou@gmail.com', 'Owner'),
    ('maxedwardcheetham@gmail.com', 'Admin')
ON CONFLICT (email) DO NOTHING;

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);

-- ============================================
-- ORGANIZATION & PROJECT TABLES
-- ============================================

-- Organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    billing_email TEXT,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    db_host TEXT DEFAULT 'localhost',
    db_port INTEGER DEFAULT 5432,
    db_name TEXT,
    db_user TEXT,
    db_password TEXT,
    encryption_salt TEXT, -- For vault encryption key derivation
    region TEXT DEFAULT 'us-east-1',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug, org_id)
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_slug ON projects(slug);

-- Project Users (many-to-many)
CREATE TABLE project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);

-- ============================================
-- API KEYS TABLE
-- ============================================

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    key_type TEXT NOT NULL, -- 'anon' or 'service_role'
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- First chars for display
    permissions JSONB DEFAULT '["read"]',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, key_type)
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- EDGE FUNCTIONS TABLES
-- ============================================

CREATE TABLE edge_functions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    trigger_type TEXT DEFAULT 'http', -- 'http', 'schedule', 'webhook'
    runtime TEXT DEFAULT 'deno',
    status TEXT DEFAULT 'active',
    timeout_ms INTEGER DEFAULT 2000,
    memory_mb INTEGER DEFAULT 128,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, slug)
);

CREATE INDEX idx_edge_functions_project ON edge_functions(project_id);
CREATE INDEX idx_edge_functions_slug ON edge_functions(slug);

-- Edge Function Files (multi-file support)
CREATE TABLE edge_function_files (
    id SERIAL PRIMARY KEY,
    function_id INTEGER REFERENCES edge_functions(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(function_id, path)
);

CREATE INDEX idx_edge_function_files_function ON edge_function_files(function_id);

-- ============================================
-- VAULT (SECRETS) TABLE
-- ============================================

CREATE TABLE vault_secrets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    value TEXT NOT NULL, -- Encrypted with project-specific key
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX idx_vault_secrets_project ON vault_secrets(project_id);

-- ============================================
-- PROVIDER CONFIGS (OAuth settings per project)
-- ============================================

CREATE TABLE provider_configs (
    id SERIAL PRIMARY KEY,
    provider_name TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT,
    scopes TEXT[],
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_name, project_id)
);

CREATE INDEX idx_provider_configs_project ON provider_configs(project_id);

-- ============================================
-- WEBHOOKS TABLE
-- ============================================

CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    secret TEXT,
    enabled BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_project ON webhooks(project_id);

-- ============================================
-- STORAGE TABLES
-- ============================================

CREATE TABLE storage_buckets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    public BOOLEAN DEFAULT false,
    file_size_limit BIGINT DEFAULT 52428800, -- 50MB default
    allowed_mime_types TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX idx_storage_buckets_project ON storage_buckets(project_id);

CREATE TABLE storage_objects (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER REFERENCES storage_buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    size BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bucket_id, path)
);

CREATE INDEX idx_storage_objects_bucket ON storage_objects(bucket_id);
CREATE INDEX idx_storage_objects_path ON storage_objects(path);

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users', 'organizations', 'projects', 'edge_functions', 
        'edge_function_files', 'vault_secrets', 'provider_configs',
        'webhooks', 'storage_buckets', 'storage_objects'
    ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
    END LOOP;
END;
$$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create isolated schema for a project
CREATE OR REPLACE FUNCTION create_project_schema(project_id INTEGER)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'p' || project_id;
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    EXECUTE format('GRANT ALL ON SCHEMA %I TO postgres', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create schema when project is created
CREATE OR REPLACE FUNCTION on_project_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_project_schema(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_schema_trigger ON projects;
CREATE TRIGGER project_schema_trigger
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION on_project_created();

SELECT 'Event Horizon schema created successfully!' as status;


-- ============================================
-- SSO CONFIGURATIONS TABLE
-- ============================================

-- SSO domain configurations for Enterprise SSO
CREATE TABLE IF NOT EXISTS sso_configurations (
    id SERIAL PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,  -- e.g., 'company.com'
    enabled BOOLEAN DEFAULT true,
    idp_type TEXT DEFAULT 'google', -- 'google', 'saml', 'oidc'
    idp_url TEXT,  -- For SAML/OIDC: IdP login URL
    idp_issuer TEXT,  -- For SAML: Entity ID
    idp_certificate TEXT,  -- For SAML: X.509 certificate
    client_id TEXT,  -- For OIDC
    client_secret TEXT,  -- For OIDC (encrypted)
    auto_provision_users BOOLEAN DEFAULT true,  -- Auto-create users on first login
    default_role TEXT DEFAULT 'Member',
    allowed_project_ids INTEGER[],  -- NULL = all projects, or specific project IDs
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sso_configurations_domain ON sso_configurations(domain);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS sso_configurations_updated_at ON sso_configurations;
CREATE TRIGGER sso_configurations_updated_at 
    BEFORE UPDATE ON sso_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'SSO configurations table created!' as status;


-- ============================================
-- MIGRATION: 001_security_hardening.sql
-- ============================================

-- ============================================
-- VECTABASE SECURITY HARDENING MIGRATION
-- Enterprise-grade security to beat Supabase
-- ============================================

-- 1. ROW LEVEL SECURITY (RLS) - Isolate projects from each other
-- ============================================

-- Enable RLS on all sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (critical!)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE project_users FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE edge_functions FORCE ROW LEVEL SECURITY;
ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;

-- 2. CREATE SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to get current user ID from session (used in RLS policies)
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS INTEGER AS $$
DECLARE
    user_id INTEGER;
BEGIN
    -- This would be set by the application via SET LOCAL
    user_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    RETURN user_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to a project
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id INTEGER, p_user_id INTEGER DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    uid INTEGER;
    has_access BOOLEAN;
BEGIN
    uid := COALESCE(p_user_id, current_user_id());
    IF uid IS NULL THEN RETURN FALSE; END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM project_users 
        WHERE project_id = p_project_id AND user_id = uid
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. RLS POLICIES - Project Isolation
-- ============================================

-- Projects: Users can only see projects they have access to
DROP POLICY IF EXISTS projects_isolation ON projects;
CREATE POLICY projects_isolation ON projects
    FOR ALL
    USING (
        id IN (SELECT project_id FROM project_users WHERE user_id = current_user_id())
        OR 
        org_id IN (SELECT id FROM organizations WHERE owner_id = current_user_id())
    );

-- Project Users: Can only see memberships for projects you're in
DROP POLICY IF EXISTS project_users_isolation ON project_users;
CREATE POLICY project_users_isolation ON project_users
    FOR ALL
    USING (
        project_id IN (SELECT project_id FROM project_users pu2 WHERE pu2.user_id = current_user_id())
    );

-- API Keys: Strict project isolation
DROP POLICY IF EXISTS api_keys_isolation ON api_keys;
CREATE POLICY api_keys_isolation ON api_keys
    FOR ALL
    USING (user_has_project_access(project_id));

-- Vault Secrets: Strict project isolation (most sensitive!)
DROP POLICY IF EXISTS vault_secrets_isolation ON vault_secrets;
CREATE POLICY vault_secrets_isolation ON vault_secrets
    FOR ALL
    USING (user_has_project_access(project_id));

-- Edge Functions: Project isolation
DROP POLICY IF EXISTS edge_functions_isolation ON edge_functions;
CREATE POLICY edge_functions_isolation ON edge_functions
    FOR ALL
    USING (user_has_project_access(project_id));

-- Edge Function Files: Inherit from parent function
DROP POLICY IF EXISTS edge_function_files_isolation ON edge_function_files;
CREATE POLICY edge_function_files_isolation ON edge_function_files
    FOR ALL
    USING (
        function_id IN (
            SELECT id FROM edge_functions WHERE user_has_project_access(project_id)
        )
    );

-- Webhooks: Project isolation
DROP POLICY IF EXISTS webhooks_isolation ON webhooks;
CREATE POLICY webhooks_isolation ON webhooks
    FOR ALL
    USING (user_has_project_access(project_id));

-- Storage Buckets: Project isolation
DROP POLICY IF EXISTS storage_buckets_isolation ON storage_buckets;
CREATE POLICY storage_buckets_isolation ON storage_buckets
    FOR ALL
    USING (user_has_project_access(project_id));

-- Storage Objects: Inherit from bucket
DROP POLICY IF EXISTS storage_objects_isolation ON storage_objects;
CREATE POLICY storage_objects_isolation ON storage_objects
    FOR ALL
    USING (
        bucket_id IN (
            SELECT id FROM storage_buckets WHERE user_has_project_access(project_id)
        )
    );

-- Provider Configs: Project isolation
DROP POLICY IF EXISTS provider_configs_isolation ON provider_configs;
CREATE POLICY provider_configs_isolation ON provider_configs
    FOR ALL
    USING (user_has_project_access(project_id));

-- 4. AUDIT LOGGING
-- ============================================

-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    resource_type TEXT,
    resource_id TEXT,
    project_id INTEGER,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_audit_project ON security_audit_log(project_id);
CREATE INDEX idx_audit_event ON security_audit_log(event_type);
CREATE INDEX idx_audit_risk ON security_audit_log(risk_level);
CREATE INDEX idx_audit_created ON security_audit_log(created_at DESC);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_project_id INTEGER DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_risk_level TEXT DEFAULT 'low'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type, user_id, action, resource_type, resource_id, 
        project_id, old_values, new_values, risk_level
    ) VALUES (
        p_event_type, current_user_id(), p_action, p_resource_type, 
        p_resource_id, p_project_id, p_old_values, p_new_values, p_risk_level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP, user_id, or API key
    identifier_type TEXT NOT NULL, -- 'ip', 'user', 'api_key'
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rate_limit_key ON rate_limits(identifier, identifier_type, endpoint);
CREATE INDEX idx_rate_limit_blocked ON rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_record rate_limits%ROWTYPE;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Check if blocked
    SELECT * INTO v_record 
    FROM rate_limits 
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type 
      AND endpoint = p_endpoint;
    
    IF FOUND AND v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN FALSE; -- Still blocked
    END IF;
    
    -- Upsert rate limit record
    INSERT INTO rate_limits (identifier, identifier_type, endpoint, request_count, window_start)
    VALUES (p_identifier, p_identifier_type, p_endpoint, 1, NOW())
    ON CONFLICT (identifier, identifier_type, endpoint) DO UPDATE SET
        request_count = CASE 
            WHEN rate_limits.window_start < v_window_start THEN 1
            ELSE rate_limits.request_count + 1
        END,
        window_start = CASE 
            WHEN rate_limits.window_start < v_window_start THEN NOW()
            ELSE rate_limits.window_start
        END,
        blocked_until = CASE 
            WHEN rate_limits.request_count >= p_max_requests THEN NOW() + INTERVAL '5 minutes'
            ELSE NULL
        END
    RETURNING * INTO v_record;
    
    RETURN v_record.request_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- 6. FAILED LOGIN TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS failed_logins (
    id SERIAL PRIMARY KEY,
    email TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT,
    failure_reason TEXT,
    attempt_count INTEGER DEFAULT 1,
    first_attempt TIMESTAMPTZ DEFAULT NOW(),
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

CREATE INDEX idx_failed_logins_ip ON failed_logins(ip_address);
CREATE INDEX idx_failed_logins_email ON failed_logins(email);
CREATE INDEX idx_failed_logins_locked ON failed_logins(locked_until) WHERE locked_until IS NOT NULL;

-- Function to record failed login and check if locked
CREATE OR REPLACE FUNCTION record_failed_login(
    p_email TEXT,
    p_ip INET,
    p_user_agent TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'invalid_credentials'
) RETURNS BOOLEAN AS $$ -- Returns TRUE if account is now locked
DECLARE
    v_attempt_count INTEGER;
    v_locked BOOLEAN := FALSE;
BEGIN
    INSERT INTO failed_logins (email, ip_address, user_agent, failure_reason)
    VALUES (p_email, p_ip, p_user_agent, p_reason)
    ON CONFLICT DO NOTHING;
    
    -- Update existing record for this IP
    UPDATE failed_logins 
    SET attempt_count = attempt_count + 1,
        last_attempt = NOW(),
        locked_until = CASE 
            WHEN attempt_count >= 4 THEN NOW() + INTERVAL '15 minutes'
            WHEN attempt_count >= 9 THEN NOW() + INTERVAL '1 hour'
            WHEN attempt_count >= 14 THEN NOW() + INTERVAL '24 hours'
            ELSE NULL
        END
    WHERE ip_address = p_ip 
      AND (email = p_email OR email IS NULL)
      AND first_attempt > NOW() - INTERVAL '24 hours'
    RETURNING attempt_count >= 5 INTO v_locked;
    
    -- Log high-risk event
    IF v_locked THEN
        PERFORM log_security_event('auth', 'account_locked', 'user', p_email, NULL, NULL, 
            jsonb_build_object('ip', p_ip::TEXT, 'reason', p_reason), 'high');
    END IF;
    
    RETURN v_locked;
END;
$$ LANGUAGE plpgsql;

-- Function to check if login is allowed
CREATE OR REPLACE FUNCTION is_login_allowed(p_email TEXT, p_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMPTZ;
BEGIN
    SELECT MAX(locked_until) INTO v_locked_until
    FROM failed_logins
    WHERE (email = p_email OR ip_address = p_ip)
      AND locked_until > NOW();
    
    RETURN v_locked_until IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clear failed logins on successful auth
CREATE OR REPLACE FUNCTION clear_failed_logins(p_email TEXT, p_ip INET)
RETURNS VOID AS $$
BEGIN
    DELETE FROM failed_logins 
    WHERE email = p_email OR ip_address = p_ip;
END;
$$ LANGUAGE plpgsql;

SELECT 'Security hardening migration complete!' as status;


-- ============================================
-- MIGRATION: 002_encryption_vault.sql
-- ============================================

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


-- ============================================
-- MIGRATION: 003_session_security.sql
-- ============================================

-- ============================================
-- VECTABASE SESSION & TOKEN SECURITY
-- Secure session management with rotation
-- ============================================

-- 1. ENHANCED SESSIONS TABLE
-- ============================================

-- Add security columns to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB;

CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked) WHERE is_revoked = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity DESC);

-- 2. SESSION MANAGEMENT FUNCTIONS
-- ============================================

-- Create a new secure session
CREATE OR REPLACE FUNCTION create_secure_session(
    p_user_id INTEGER,
    p_ip INET,
    p_user_agent TEXT,
    p_fingerprint TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
) RETURNS TABLE(session_id INTEGER, token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_token TEXT;
    v_token_hash TEXT;
    v_fingerprint_hash TEXT;
    v_expires TIMESTAMPTZ;
    v_session_id INTEGER;
BEGIN
    -- Generate secure token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_fingerprint_hash := CASE WHEN p_fingerprint IS NOT NULL 
        THEN encode(digest(p_fingerprint, 'sha256'), 'hex') 
        ELSE NULL END;
    v_expires := NOW() + INTERVAL '7 days';
    
    -- Limit concurrent sessions per user (max 5)
    DELETE FROM sessions 
    WHERE user_id = p_user_id 
      AND id NOT IN (
          SELECT id FROM sessions 
          WHERE user_id = p_user_id 
          ORDER BY last_activity DESC 
          LIMIT 4
      );
    
    -- Create session
    INSERT INTO sessions (
        user_id, token_hash, expires_at, ip_address, 
        user_agent, fingerprint_hash, device_info
    ) VALUES (
        p_user_id, v_token_hash, v_expires, p_ip,
        p_user_agent, v_fingerprint_hash, p_device_info
    ) RETURNING id INTO v_session_id;
    
    -- Clear any failed logins
    PERFORM clear_failed_logins(
        (SELECT email FROM users WHERE id = p_user_id),
        p_ip
    );
    
    -- Audit log
    PERFORM log_security_event('auth', 'session_created', 'session', v_session_id::TEXT, NULL, NULL,
        jsonb_build_object('ip', p_ip::TEXT, 'user_agent', left(p_user_agent, 100)), 'low');
    
    RETURN QUERY SELECT v_session_id, v_token, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate and refresh session
CREATE OR REPLACE FUNCTION validate_session(
    p_token TEXT,
    p_ip INET DEFAULT NULL,
    p_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE(
    user_id INTEGER, 
    email TEXT, 
    name TEXT,
    is_valid BOOLEAN,
    new_token TEXT
) AS $$
DECLARE
    v_token_hash TEXT;
    v_fingerprint_hash TEXT;
    v_session sessions%ROWTYPE;
    v_user users%ROWTYPE;
    v_new_token TEXT;
    v_should_rotate BOOLEAN;
BEGIN
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
    v_fingerprint_hash := CASE WHEN p_fingerprint IS NOT NULL 
        THEN encode(digest(p_fingerprint, 'sha256'), 'hex') 
        ELSE NULL END;
    
    -- Find session
    SELECT * INTO v_session FROM sessions 
    WHERE token_hash = v_token_hash 
      AND NOT is_revoked 
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Fingerprint validation (if provided)
    IF v_fingerprint_hash IS NOT NULL AND v_session.fingerprint_hash IS NOT NULL 
       AND v_fingerprint_hash != v_session.fingerprint_hash THEN
        -- Potential session hijacking!
        UPDATE sessions SET is_revoked = TRUE, revoked_reason = 'fingerprint_mismatch' 
        WHERE id = v_session.id;
        
        PERFORM log_security_event('auth', 'session_hijack_attempt', 'session', 
            v_session.id::TEXT, NULL, NULL,
            jsonb_build_object('ip', p_ip::TEXT, 'expected_fp', v_session.fingerprint_hash), 'critical');
        
        RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Get user
    SELECT * INTO v_user FROM users WHERE id = v_session.user_id;
    
    -- Check if token should be rotated (every 15 minutes or 10 refreshes)
    v_should_rotate := v_session.last_activity < NOW() - INTERVAL '15 minutes'
                    OR v_session.refresh_count >= 10;
    
    IF v_should_rotate THEN
        -- Generate new token
        v_new_token := encode(gen_random_bytes(32), 'hex');
        
        UPDATE sessions SET
            token_hash = encode(digest(v_new_token, 'sha256'), 'hex'),
            refresh_count = 0,
            last_activity = NOW(),
            ip_address = COALESCE(p_ip, ip_address)
        WHERE id = v_session.id;
    ELSE
        -- Just update activity
        UPDATE sessions SET
            refresh_count = refresh_count + 1,
            last_activity = NOW()
        WHERE id = v_session.id;
        
        v_new_token := NULL;
    END IF;
    
    RETURN QUERY SELECT v_user.id, v_user.email, v_user.name, TRUE, v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke session
CREATE OR REPLACE FUNCTION revoke_session(
    p_session_id INTEGER,
    p_reason TEXT DEFAULT 'user_logout'
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sessions SET 
        is_revoked = TRUE, 
        revoked_reason = p_reason
    WHERE id = p_session_id;
    
    PERFORM log_security_event('auth', 'session_revoked', 'session', p_session_id::TEXT, 
        NULL, NULL, jsonb_build_object('reason', p_reason), 'low');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all sessions for a user (password change, security concern)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
    p_user_id INTEGER,
    p_reason TEXT DEFAULT 'security_action',
    p_except_session_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE sessions SET 
        is_revoked = TRUE, 
        revoked_reason = p_reason
    WHERE user_id = p_user_id 
      AND NOT is_revoked
      AND (p_except_session_id IS NULL OR id != p_except_session_id);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    PERFORM log_security_event('auth', 'all_sessions_revoked', 'user', p_user_id::TEXT, 
        NULL, NULL, jsonb_build_object('reason', p_reason, 'count', v_count), 'high');
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CLEANUP JOBS
-- ============================================

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Also clean up old failed logins
    DELETE FROM failed_logins WHERE last_attempt < NOW() - INTERVAL '7 days';
    
    -- Clean up old rate limits
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. ACTIVE SESSIONS VIEW
-- ============================================

CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.email,
    u.name,
    s.ip_address,
    s.user_agent,
    s.created_at,
    s.last_activity,
    s.expires_at,
    s.device_info,
    CASE 
        WHEN s.last_activity > NOW() - INTERVAL '5 minutes' THEN 'active'
        WHEN s.last_activity > NOW() - INTERVAL '1 hour' THEN 'idle'
        ELSE 'inactive'
    END as status
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE NOT s.is_revoked AND s.expires_at > NOW();

SELECT 'Session security complete!' as status;


-- ============================================
-- DATA DUMP
-- ============================================

-- _vectabase_migrations data
INSERT INTO "_vectabase_migrations" ("id", "project_id", "filename", "hash", "executed_at") VALUES (1, 5, '002_cli_test.sql', '748da4cd727878d8ffef9fb344f76ff55cd72c4cf6a841e35c254b4d611438de', '2026-01-26T20:10:09.784Z') ON CONFLICT DO NOTHING;
INSERT INTO "_vectabase_migrations" ("id", "project_id", "filename", "hash", "executed_at") VALUES (2, 1, '001_create_test_table.sql', '89702f81884e608419aa712dfdebb1c378dd478aed95f5b78acb6872cee257b4', '2026-01-30T20:03:41.444Z') ON CONFLICT DO NOTHING;
INSERT INTO "_vectabase_migrations" ("id", "project_id", "filename", "hash", "executed_at") VALUES (3, 1, '002_cli_test.sql', '748da4cd727878d8ffef9fb344f76ff55cd72c4cf6a841e35c254b4d611438de', '2026-01-30T20:03:41.499Z') ON CONFLICT DO NOTHING;

-- announcements data
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (1, 'sigma test 123', 'thecheesemanatyou@gmail.com', '2026-01-25T19:47:00.089Z', '2026-01-25T19:47:00.089Z') ON CONFLICT DO NOTHING;
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (2, 'Edge Audit: Found 2 users. Engagement Score: 84. Secret used: blah', 'system@vectabase.edge', '2026-01-25T21:06:34.913Z', '2026-01-25T21:06:34.913Z') ON CONFLICT DO NOTHING;
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (3, 'Edge Audit: Found 2 users. Engagement Score: 84. Secret used: blah', 'system@vectabase.edge', '2026-01-26T17:09:10.611Z', '2026-01-26T17:09:10.611Z') ON CONFLICT DO NOTHING;
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (4, 'Edge Audit: Found 2 users. Engagement Score: 84. Secret used: blah', 'system@vectabase.edge', '2026-01-26T17:10:48.305Z', '2026-01-26T17:10:48.305Z') ON CONFLICT DO NOTHING;
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (5, 'Edge Audit: Found 2 users. Engagement Score: 84. Secret used: blah', 'system@vectabase.edge', '2026-01-26T17:18:09.890Z', '2026-01-26T17:18:09.890Z') ON CONFLICT DO NOTHING;
INSERT INTO "announcements" ("id", "content", "author_email", "created_at", "updated_at") VALUES (6, 'Edge Audit: Found 2 users. Engagement Score: 84. Secret used: ultr', 'system@vectabase.edge', '2026-01-26T17:38:41.316Z', '2026-01-26T17:38:41.316Z') ON CONFLICT DO NOTHING;

-- api_keys data
INSERT INTO "api_keys" ("id", "project_id", "name", "key_type", "key_hash", "key_prefix", "permissions", "expires_at", "last_used_at", "created_at") VALUES (1, 1, NULL, 'anon', 'd73025c9a3f7275953f56c47b4dca8440cae2f00f3fff4d1c495f882717dabdc', 'eh_anon_y1c_63x9...', ARRAY['read'], NULL, NULL, '2026-01-30T20:01:26.970Z') ON CONFLICT DO NOTHING;
INSERT INTO "api_keys" ("id", "project_id", "name", "key_type", "key_hash", "key_prefix", "permissions", "expires_at", "last_used_at", "created_at") VALUES (2, 1, NULL, 'service_role', '97286c02108c2b0d59203b687e7009dc2794622465ec89595c4715c167a442d4', 'eh_secret_G5kUNs...', ARRAY['read'], NULL, '2026-01-30T20:04:45.540Z', '2026-01-30T20:01:26.975Z') ON CONFLICT DO NOTHING;

-- app_users data
INSERT INTO "app_users" ("id", "username", "email", "created_at") VALUES (1, 'max', 'max@example.com', '2026-01-25T17:10:37.949Z') ON CONFLICT DO NOTHING;

-- edge_function_files data
INSERT INTO "edge_function_files" ("id", "function_id", "path", "content", "created_at", "updated_at") VALUES (1, 1, 'index.ts', '// Hello World Edge Function
console.log(''Function invoked!'');
console.log(''Event body:'', JSON.stringify(event.body));

// Access secrets (if any)
if (secrets.API_KEY) {
    console.log(''API_KEY is configured'');
}

// Return a response
return {
    message: ''Hello from Event Horizon!'',
    timestamp: new Date().toISOString(),
    received: event.body
};', '2026-01-30T20:01:17.659Z', '2026-01-30T20:01:17.659Z') ON CONFLICT DO NOTHING;
INSERT INTO "edge_function_files" ("id", "function_id", "path", "content", "created_at", "updated_at") VALUES (2, 2, 'index.ts', '// Test Edge Function with Secrets
console.log(''Test function invoked!'');
console.log(''Request body:'', JSON.stringify(event.body));

// Test secrets access
console.log(''Checking secrets...'');
if (secrets.TEST_API_KEY) {
    console.log(''TEST_API_KEY found:'', secrets.TEST_API_KEY.substring(0, 8) + ''...'');
} else {
    console.log(''No TEST_API_KEY secret found'');
}

// Test database access
const result = await db.query(''SELECT NOW() as time'');
console.log(''DB time:'', result[0]?.time);

return {
    success: true,
    message: ''Hello from test function!'',
    hasSecret: !!secrets.TEST_API_KEY,
    timestamp: new Date().toISOString(),
    dbTime: result[0]?.time
};
', '2026-01-30T20:02:57.468Z', '2026-01-30T20:04:39.452Z') ON CONFLICT DO NOTHING;
INSERT INTO "edge_function_files" ("id", "function_id", "path", "content", "created_at", "updated_at") VALUES (4, 4, 'index.ts', 'return { message: ''Hello from index'' };', '2026-01-30T20:06:39.034Z', '2026-01-30T20:06:39.034Z') ON CONFLICT DO NOTHING;

-- edge_functions data
INSERT INTO "edge_functions" ("id", "project_id", "name", "slug", "trigger_type", "runtime", "status", "timeout_ms", "memory_mb", "created_at", "updated_at") VALUES (1, 1, 'Hello World', 'hello-world', 'http', 'deno', 'active', 2000, 128, '2026-01-30T20:01:17.658Z', '2026-01-30T20:01:17.658Z') ON CONFLICT DO NOTHING;
INSERT INTO "edge_functions" ("id", "project_id", "name", "slug", "trigger_type", "runtime", "status", "timeout_ms", "memory_mb", "created_at", "updated_at") VALUES (2, 1, 'test-func', 'test-func', 'http', 'deno', 'active', 2000, 128, '2026-01-30T20:02:57.462Z', '2026-01-30T20:04:39.446Z') ON CONFLICT DO NOTHING;
INSERT INTO "edge_functions" ("id", "project_id", "name", "slug", "trigger_type", "runtime", "status", "timeout_ms", "memory_mb", "created_at", "updated_at") VALUES (4, 2, 'index', 'index', 'http', 'deno', 'active', 2000, 128, '2026-01-30T20:06:39.031Z', '2026-01-30T20:06:39.031Z') ON CONFLICT DO NOTHING;

-- organizations data
INSERT INTO "organizations" ("id", "name", "slug", "owner_id", "billing_email", "plan", "created_at", "updated_at") VALUES (1, 'Local Development', 'local-dev', 1, NULL, 'free', '2026-01-30T20:01:17.638Z', '2026-01-30T20:01:17.638Z') ON CONFLICT DO NOTHING;
INSERT INTO "organizations" ("id", "name", "slug", "owner_id", "billing_email", "plan", "created_at", "updated_at") VALUES (2, 'Default Org', 'default-org', 3, NULL, 'free', '2026-01-30T20:06:03.737Z', '2026-01-30T20:06:03.737Z') ON CONFLICT DO NOTHING;
INSERT INTO "organizations" ("id", "name", "slug", "owner_id", "billing_email", "plan", "created_at", "updated_at") VALUES (3, 'test123', 'test123', 3, NULL, 'free', '2026-01-30T20:19:25.575Z', '2026-01-30T20:19:25.575Z') ON CONFLICT DO NOTHING;

-- permissions data
INSERT INTO "permissions" ("id", "email", "access_level", "created_at") VALUES (1, 'thecheesemanatyou@gmail.com', 'Owner', '2026-01-30T20:01:16.819Z') ON CONFLICT DO NOTHING;
INSERT INTO "permissions" ("id", "email", "access_level", "created_at") VALUES (3, 'lattice-admin@vectabase.internal', 'Owner', '2026-01-30T20:25:17.134Z') ON CONFLICT DO NOTHING;

-- project_users data
INSERT INTO "project_users" ("id", "project_id", "user_id", "role", "created_at") VALUES (1, 1, 1, 'Owner', '2026-01-30T20:01:17.655Z') ON CONFLICT DO NOTHING;
INSERT INTO "project_users" ("id", "project_id", "user_id", "role", "created_at") VALUES (2, 2, 3, 'Member', '2026-01-30T20:06:03.742Z') ON CONFLICT DO NOTHING;
INSERT INTO "project_users" ("id", "project_id", "user_id", "role", "created_at") VALUES (3, 2, 9, 'Developer', '2026-01-31T08:53:03.225Z') ON CONFLICT DO NOTHING;

-- projects data
INSERT INTO "projects" ("id", "name", "slug", "org_id", "db_host", "db_port", "db_name", "db_user", "db_password", "encryption_salt", "region", "status", "created_at", "updated_at") VALUES (1, 'Test Project', 'test-project', 1, 'localhost', 5432, 'postgres', 'postgres', 'postgres', '7b0756cba4a2f079d7c2bdef0cebe603', 'us-east-1', 'active', '2026-01-30T20:01:17.641Z', '2026-01-30T20:03:07.053Z') ON CONFLICT DO NOTHING;
INSERT INTO "projects" ("id", "name", "slug", "org_id", "db_host", "db_port", "db_name", "db_user", "db_password", "encryption_salt", "region", "status", "created_at", "updated_at") VALUES (2, 'Main Project', 'main-project', 2, 'localhost', 5432, NULL, NULL, NULL, NULL, 'us-east-1', 'active', '2026-01-30T20:06:03.739Z', '2026-01-30T20:06:03.739Z') ON CONFLICT DO NOTHING;
INSERT INTO "projects" ("id", "name", "slug", "org_id", "db_host", "db_port", "db_name", "db_user", "db_password", "encryption_salt", "region", "status", "created_at", "updated_at") VALUES (3, 'test123', 'test123', 3, 'localhost', 5432, NULL, NULL, NULL, NULL, 'us-east-1', 'active', '2026-01-30T20:19:27.538Z', '2026-01-30T20:19:27.538Z') ON CONFLICT DO NOTHING;

-- roblox_users data
INSERT INTO "roblox_users" ("id", "project_id", "created_at", "updated_at") VALUES (1, 2, '2026-01-25T18:56:57.407Z', '2026-01-25T18:56:55.000Z') ON CONFLICT DO NOTHING;

-- sso_configurations data
INSERT INTO "sso_configurations" ("id", "domain", "enabled", "idp_type", "idp_url", "idp_issuer", "idp_certificate", "client_id", "client_secret", "auto_provision_users", "default_role", "allowed_project_ids", "created_by", "created_at", "updated_at") VALUES (1, 'testcompany.com', TRUE, 'google', '', NULL, NULL, NULL, NULL, TRUE, 'Member', ARRAY['2'], NULL, '2026-01-30T20:35:13.688Z', '2026-01-30T20:35:52.657Z') ON CONFLICT DO NOTHING;
INSERT INTO "sso_configurations" ("id", "domain", "enabled", "idp_type", "idp_url", "idp_issuer", "idp_certificate", "client_id", "client_secret", "auto_provision_users", "default_role", "allowed_project_ids", "created_by", "created_at", "updated_at") VALUES (2, 'vectabase.com', TRUE, 'email', '', NULL, NULL, NULL, NULL, TRUE, 'Developer', ARRAY['2'], NULL, '2026-01-30T20:58:59.160Z', '2026-01-30T21:02:34.076Z') ON CONFLICT DO NOTHING;

-- test data
INSERT INTO "test" ("id", "project_id", "created_at", "updated_at") VALUES (9, 2, '2026-01-25T18:27:56.585Z', '2026-01-25T18:27:56.585Z') ON CONFLICT DO NOTHING;
INSERT INTO "test" ("id", "project_id", "created_at", "updated_at") VALUES (12, 2, '2026-01-25T18:33:07.098Z', '2026-01-25T18:33:07.098Z') ON CONFLICT DO NOTHING;
INSERT INTO "test" ("id", "project_id", "created_at", "updated_at") VALUES (13, 2, '2026-01-25T18:39:42.336Z', '2026-01-25T18:38:59.000Z') ON CONFLICT DO NOTHING;

-- users data
INSERT INTO "users" ("id", "email", "name", "avatar_url", "identity_id", "provider", "created_at", "updated_at", "password_hash") VALUES (1, 'test@localhost', 'Local Developer', NULL, 'local-dev-001', 'local', '2026-01-30T20:01:17.635Z', '2026-01-30T20:01:17.635Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "email", "name", "avatar_url", "identity_id", "provider", "created_at", "updated_at", "password_hash") VALUES (2, 'maxedwardcheetham@gmail.com', 'Phoenix Cheetah', NULL, 'google:101801468049696456427', 'google', '2026-01-30T20:05:50.170Z', '2026-01-30T20:05:50.170Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "email", "name", "avatar_url", "identity_id", "provider", "created_at", "updated_at", "password_hash") VALUES (3, 'thecheesemanatyou@gmail.com', 'thecheese manatyou', NULL, 'google:118142992181711626941', 'google', '2026-01-30T20:06:03.735Z', '2026-01-30T20:06:03.735Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "email", "name", "avatar_url", "identity_id", "provider", "created_at", "updated_at", "password_hash") VALUES (9, 'support@vectabase.com', 'support', NULL, 'sso:vectabase.com:1769849583223', 'sso', '2026-01-31T08:53:03.223Z', '2026-01-31T08:53:17.071Z', 'vectabase-sso-9-1769849597070:c1add7ea8e58b0015322522a199ab6907210f867e793441038b2c46bc56fb0a4') ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "email", "name", "avatar_url", "identity_id", "provider", "created_at", "updated_at", "password_hash") VALUES (4, 'lattice-admin@vectabase.internal', 'Lattice Admin', NULL, 'lattice:master-admin', 'lattice', '2026-01-30T20:25:17.132Z', '2026-01-31T09:58:56.931Z', NULL) ON CONFLICT DO NOTHING;

-- vault_secrets data
INSERT INTO "vault_secrets" ("id", "project_id", "name", "description", "value", "created_at", "updated_at") VALUES (1, 1, 'TEST_API_KEY', 'Test API key', 'vPHw5Dfs8gzwaWl1WFMIqpy7E0r7CE4bjgeExqFLyD7YqqWnuB/cVTI=', '2026-01-30T20:04:17.037Z', '2026-01-30T20:04:17.037Z') ON CONFLICT DO NOTHING;

-- yes123 data
INSERT INTO "yes123" ("id", "project_id", "created_at", "updated_at", "test123") VALUES (1, 2, '2026-01-25T18:48:15.870Z', '2026-01-25T18:48:13.000Z', '4234') ON CONFLICT DO NOTHING;


-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================

SELECT 'Vectabase database deployed successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as org_count FROM organizations;
