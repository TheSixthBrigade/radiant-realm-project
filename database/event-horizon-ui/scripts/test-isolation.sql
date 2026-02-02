-- Test project isolation
-- Check all tables in public schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;

-- Check table registry
SELECT * FROM _table_registry ORDER BY project_id;

-- Check which tables have project_id column
SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'project_id';
