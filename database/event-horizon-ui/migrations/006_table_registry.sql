-- Migration: Table Registry for Project Isolation
-- This tracks which project owns each user-created table

CREATE TABLE IF NOT EXISTS _table_registry (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL UNIQUE,
    project_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS _table_registry_project_idx ON _table_registry(project_id);

-- Grant access
GRANT ALL ON _table_registry TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE _table_registry_id_seq TO PUBLIC;
