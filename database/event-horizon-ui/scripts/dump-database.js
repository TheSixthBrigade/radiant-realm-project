/**
 * Dump the complete Vectabase database to SQL file
 * Includes schema + all data + security migrations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function dumpDatabase() {
    console.log('🔄 Dumping Vectabase database...\n');
    
    const outputPath = path.join(__dirname, '..', 'dump_data.sql');
    
    // Start building the SQL dump
    let sql = `-- ============================================
-- VECTABASE COMPLETE DATABASE DUMP
-- Generated: ${new Date().toISOString().split('T')[0]}
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

`;

    // Read and append schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        // Extract just the table definitions (skip the DROP statements we already have)
        const tableStart = schemaContent.indexOf('-- Users table');
        if (tableStart > 0) {
            sql += '\n-- ============================================\n';
            sql += '-- SCHEMA FROM schema.sql\n';
            sql += '-- ============================================\n\n';
            sql += schemaContent.substring(tableStart);
        }
    }

    // Read and append security migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (fs.existsSync(migrationsDir)) {
        const migrations = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        
        for (const migration of migrations) {
            sql += '\n\n-- ============================================\n';
            sql += `-- MIGRATION: ${migration}\n`;
            sql += '-- ============================================\n\n';
            sql += fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
        }
    }

    // Now dump actual data from tables
    sql += '\n\n-- ============================================\n';
    sql += '-- DATA DUMP\n';
    sql += '-- ============================================\n\n';

    // Tables to dump data from (in order of dependencies)
    const tablesToDump = [
        'users',
        'permissions', 
        'organizations',
        'projects',
        'project_users',
        'sso_configurations',
        'sessions',
        'api_keys',
        'edge_functions',
        'edge_function_files',
        'vault_secrets',
        'provider_configs',
        'webhooks',
        'storage_buckets',
        'storage_objects'
    ];

    for (const table of tablesToDump) {
        try {
            // Check if table exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                )
            `, [table]);
            
            if (!tableCheck.rows[0].exists) {
                console.log(`  ⚠️  Table ${table} doesn't exist, skipping`);
                continue;
            }

            // Get all rows
            const result = await pool.query(`SELECT * FROM "${table}"`);
            
            if (result.rows.length === 0) {
                console.log(`  📭 ${table}: 0 rows`);
                continue;
            }

            console.log(`  📦 ${table}: ${result.rows.length} rows`);

            // Get column names
            const columns = Object.keys(result.rows[0]);
            
            sql += `-- ${table} data\n`;
            
            for (const row of result.rows) {
                const values = columns.map(col => {
                    const val = row[col];
                    if (val === null) return 'NULL';
                    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                    if (typeof val === 'number') return val.toString();
                    if (val instanceof Date) return `'${val.toISOString()}'`;
                    if (Array.isArray(val)) return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return `'${String(val).replace(/'/g, "''")}'`;
                });
                
                sql += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
            }
            sql += '\n';
            
        } catch (error) {
            console.log(`  ❌ ${table}: ${error.message}`);
        }
    }

    // Add final status message
    sql += `
-- ============================================
-- DEPLOYMENT COMPLETE
-- ============================================

SELECT 'Vectabase database deployed successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as org_count FROM organizations;
`;

    // Write to file
    fs.writeFileSync(outputPath, sql);
    
    console.log(`\n✅ Database dump saved to: ${outputPath}`);
    console.log(`\n📤 To deploy to VPS, run:`);
    console.log(`   scp database/event-horizon-ui/dump_data.sql root@51.210.97.81:/tmp/`);
    console.log(`\n📥 Then on VPS:`);
    console.log(`   ssh root@51.210.97.81`);
    console.log(`   PGPASSWORD='your-super-secret-and-long-postgres-password' psql -U postgres -d postgres -f /tmp/dump_data.sql`);
    
    await pool.end();
}

dumpDatabase().catch(err => {
    console.error('Dump failed:', err);
    process.exit(1);
});
