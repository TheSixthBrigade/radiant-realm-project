-- Event Horizon Database Schema
-- Clean slate - drops everything and recreates

-- Drop all existing objects
DROP SCHEMA IF EXISTS p1 CASCADE;
DROP SCHEMA IF EXISTS p2 CASCADE;
DROP SCHEMA IF EXISTS p3 CASCADE;
DROP SCHEMA IF EXISTS p4 CASCADE;
DROP SCHEMA IF EXISTS p5 CASCADE;

DROP TABLE IF EXISTS provider_configs CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS edge_functions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    identity_id TEXT UNIQUE,
    provider TEXT DEFAULT 'google',
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

-- Organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug, org_id)
);

CREATE INDEX idx_projects_org ON projects(org_id);

-- Project Users (many-to-many)
CREATE TABLE project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- API Keys table
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    permissions JSONB DEFAULT '["read"]',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- Edge Functions table
CREATE TABLE edge_functions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    code TEXT,
    runtime TEXT DEFAULT 'deno',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, slug)
);

CREATE INDEX idx_edge_functions_project ON edge_functions(project_id);

-- Provider Configs (OAuth settings per project)
CREATE TABLE provider_configs (
    id SERIAL PRIMARY KEY,
    provider_name TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_name, project_id)
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS edge_functions_updated_at ON edge_functions;
CREATE TRIGGER edge_functions_updated_at BEFORE UPDATE ON edge_functions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Event Horizon schema created successfully!' as status;
