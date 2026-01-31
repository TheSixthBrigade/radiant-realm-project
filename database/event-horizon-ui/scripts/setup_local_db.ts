#!/usr/bin/env npx tsx
/**
 * Local Database Setup Script
 * Initializes the Event Horizon database schema for local development
 * 
 * Usage: npx tsx scripts/setup_local_db.ts
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function main() {
    console.log('🚀 Event Horizon - Local Database Setup');
    console.log('========================================\n');

    try {
        // Test connection
        console.log('📡 Testing database connection...');
        const testResult = await pool.query('SELECT NOW() as time');
        console.log(`✅ Connected! Server time: ${testResult.rows[0].time}\n`);

        // Read and execute schema
        console.log('📄 Loading schema.sql...');
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log(`   Found ${schema.length} bytes\n`);

        console.log('⚡ Executing schema...');
        await pool.query(schema);
        console.log('✅ Schema applied successfully!\n');

        // Create a test organization and project for local dev
        console.log('🏗️  Creating test data for local development...');

        // Check if test user exists
        const userCheck = await pool.query("SELECT id FROM users WHERE email = 'test@localhost'");
        let userId: number;

        if (userCheck.rows.length === 0) {
            const userResult = await pool.query(`
                INSERT INTO users (email, name, identity_id, provider)
                VALUES ('test@localhost', 'Local Developer', 'local-dev-001', 'local')
                RETURNING id
            `);
            userId = userResult.rows[0].id;
            console.log(`   Created test user (ID: ${userId})`);
        } else {
            userId = userCheck.rows[0].id;
            console.log(`   Test user already exists (ID: ${userId})`);
        }

        // Check if test org exists
        const orgCheck = await pool.query("SELECT id FROM organizations WHERE slug = 'local-dev'");
        let orgId: number;

        if (orgCheck.rows.length === 0) {
            const orgResult = await pool.query(`
                INSERT INTO organizations (name, slug, owner_id)
                VALUES ('Local Development', 'local-dev', $1)
                RETURNING id
            `, [userId]);
            orgId = orgResult.rows[0].id;
            console.log(`   Created test organization (ID: ${orgId})`);
        } else {
            orgId = orgCheck.rows[0].id;
            console.log(`   Test organization already exists (ID: ${orgId})`);
        }

        // Check if test project exists
        const projCheck = await pool.query("SELECT id FROM projects WHERE slug = 'test-project' AND org_id = $1", [orgId]);
        let projectId: number;

        if (projCheck.rows.length === 0) {
            const projResult = await pool.query(`
                INSERT INTO projects (name, slug, org_id, db_host, db_port, db_name, db_user, db_password)
                VALUES ('Test Project', 'test-project', $1, 'localhost', 5432, 'postgres', 'postgres', 'postgres')
                RETURNING id
            `, [orgId]);
            projectId = projResult.rows[0].id;
            console.log(`   Created test project (ID: ${projectId})`);
        } else {
            projectId = projCheck.rows[0].id;
            console.log(`   Test project already exists (ID: ${projectId})`);
        }

        // Add user to project
        await pool.query(`
            INSERT INTO project_users (project_id, user_id, role)
            VALUES ($1, $2, 'Owner')
            ON CONFLICT (project_id, user_id) DO NOTHING
        `, [projectId, userId]);

        // Create a sample edge function
        const funcCheck = await pool.query("SELECT id FROM edge_functions WHERE slug = 'hello-world' AND project_id = $1", [projectId]);
        
        if (funcCheck.rows.length === 0) {
            const funcResult = await pool.query(`
                INSERT INTO edge_functions (project_id, name, slug, trigger_type)
                VALUES ($1, 'Hello World', 'hello-world', 'http')
                RETURNING id
            `, [projectId]);
            
            const funcId = funcResult.rows[0].id;
            
            await pool.query(`
                INSERT INTO edge_function_files (function_id, path, content)
                VALUES ($1, 'index.ts', $2)
            `, [funcId, `// Hello World Edge Function
console.log('Function invoked!');
console.log('Event body:', JSON.stringify(event.body));

// Access secrets (if any)
if (secrets.API_KEY) {
    console.log('API_KEY is configured');
}

// Return a response
return {
    message: 'Hello from Event Horizon!',
    timestamp: new Date().toISOString(),
    received: event.body
};`]);
            
            console.log(`   Created sample edge function (ID: ${funcId})`);
        } else {
            console.log('   Sample edge function already exists');
        }

        console.log('\n========================================');
        console.log('✅ Setup complete!\n');
        console.log('📋 Test Data Summary:');
        console.log(`   User ID:    ${userId}`);
        console.log(`   Org ID:     ${orgId}`);
        console.log(`   Project ID: ${projectId}`);
        console.log('\n🔑 To generate API keys, run:');
        console.log('   npx tsx scripts/gen_service_key.ts ' + projectId);
        console.log('\n🌐 Start the dev server:');
        console.log('   npm run dev');
        console.log('\n📖 Then visit: http://localhost:3000');

    } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Make sure PostgreSQL is running:');
            console.error('   - Docker: docker start vectabase-db');
            console.error('   - Local: pg_isready -h localhost -p 5432');
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
