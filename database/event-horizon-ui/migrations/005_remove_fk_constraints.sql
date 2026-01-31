-- Remove foreign key constraints from user-created tables
-- These constraints cause "violates foreign key constraint" errors when inserting rows

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all foreign key constraints that reference the projects table
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'projects'
        AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE "public"."' || r.table_name || '" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
        RAISE NOTICE 'Dropped constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- Verify no FK constraints remain on project_id columns pointing to projects
SELECT tc.table_name, tc.constraint_name, ccu.table_name as references_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'projects'
AND tc.table_schema = 'public';
