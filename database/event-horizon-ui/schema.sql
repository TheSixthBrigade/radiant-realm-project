-- Event Horizon UI Database Schema
-- This schema is for the db.vectabase.com database management interface

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to recreate with correct types
DROP TABLE IF EXISTS edge_functions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS provider_configs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    google_id TEXT,
    roblox_id TEXT,
    identity_id TEXT,
    provider TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_identity_id ON users(identity_id);

-- ============================================
-- PERMISSIONS TABLE
-- ============================================
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-authorize owner and admin
INSERT INTO permissions (email, access_level) VALUES 
    ('thecheesemanatyou@gmail.com', 'Owner'),
    ('maxedwardcheetham@gmail.com', 'Admin');

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    encryption_salt TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug, org_id)
);

CREATE INDEX idx_projects_org ON projects(org_id);

-- ============================================
-- PROJECT USERS TABLE
-- ============================================
CREATE TABLE project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- ============================================
-- PROVIDER CONFIGS TABLE
-- ============================================
CREATE TABLE provider_configs (
    id SERIAL PRIMARY KEY,
    provider_name TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_name, project_id)
);

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL DEFAULT 'anon',
    key_hash TEXT NOT NULL,
    key_prefix TEXT,
    name TEXT,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE organization_members (
    id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    project_id INTEGER REFERENCES projects(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EDGE FUNCTIONS TABLE
-- ============================================
CREATE TABLE edge_functions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    code TEXT DEFAULT '',
    runtime TEXT DEFAULT 'deno',
    trigger_type TEXT DEFAULT 'http',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, slug)
);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_edge_functions_updated_at BEFORE UPDATE ON edge_functions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Event Horizon schema created successfully!' AS status;
