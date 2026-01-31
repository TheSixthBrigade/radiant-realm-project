-- ============================================
-- VECTABASE VPS DEPLOYMENT SQL
-- Generated: 2026-01-30
-- Deploy to: db.vectabase.com
-- ============================================
-- 
-- Usage: scp vps-deploy.sql user@db.vectabase.com:/tmp/
--        ssh user@db.vectabase.com
--        psql -U postgres -d postgres -f /tmp/vps-deploy.sql
--
-- ============================================

-- Drop all existing objects for clean slate
DROP SCHEMA IF EXISTS p1 CASCADE;
DROP SCHEMA IF EXISTS p2 CASCADE;
DROP SCHEMA IF EXISTS p3 CASCADE;
DROP SCHEMA IF EXISTS p4 CASCADE;
DROP SCHEMA IF EXISTS p5 CASCADE;

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

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    identity_id TEXT UNIQUE,
    provider TEXT DEFAULT 'google',
    password_hash TEXT,  -- For SSO email/password login
    role TEXT DEFAULT 'Member',
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
    encryption_salt TEXT,
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
-- SSO CONFIGURATIONS TABLE
-- ============================================

CREATE TABLE sso_configurations (
    id SERIAL PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    idp_type TEXT DEFAULT 'google',  -- 'google', 'saml', 'oidc', 'email'
    idp_url TEXT,
    idp_issuer TEXT,
    idp_certificate TEXT,
    client_id TEXT,
    client_secret TEXT,
    auto_provision_users BOOLEAN DEFAULT true,
    default_role TEXT DEFAULT 'Member',
    allowed_project_ids INTEGER[],
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sso_configurations_domain ON sso_configurations(domain);

-- ============================================
-- API KEYS TABLE
-- ============================================

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    key_type TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
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
    trigger_type TEXT DEFAULT 'http',
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
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX idx_vault_secrets_project ON vault_secrets(project_id);

-- ============================================
-- PROVIDER CONFIGS
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
    file_size_limit BIGINT DEFAULT 52428800,
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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users', 'organizations', 'projects', 'edge_functions', 
        'edge_function_files', 'vault_secrets', 'provider_configs',
        'webhooks', 'storage_buckets', 'storage_objects', 'sso_configurations'
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

-- ============================================
-- DONE
-- ============================================

SELECT 'Vectabase schema deployed successfully!' as status;
SELECT 'Tables created: users, permissions, sessions, organizations, projects, project_users, sso_configurations, api_keys, edge_functions, edge_function_files, vault_secrets, provider_configs, webhooks, storage_buckets, storage_objects' as tables;
