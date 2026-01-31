#!/usr/bin/env npx tsx
/**
 * Generate Service Role API Key
 * Creates a new service_role API key for a project
 * 
 * Usage: npx tsx scripts/gen_service_key.ts [projectId]
 */

import { Pool } from 'pg';
import crypto from 'crypto';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function generateApiKey(prefix: string = 'eh'): string {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${randomPart}`;
}

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function createServiceKey(projectId: number) {
    console.log('🔑 Generating Service Role API Key');
    console.log('===================================\n');

    // Check project exists
    const projCheck = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
    if (projCheck.rows.length === 0) {
        console.error(`❌ Project ${projectId} not found!`);
        console.log('\n💡 Run setup first: npm run db:setup');
        process.exit(1);
    }

    console.log(`Project: ${projCheck.rows[0].name} (ID: ${projectId})\n`);

    // Generate keys
    const anonKey = generateApiKey('eh_anon');
    const serviceKey = generateApiKey('eh_secret');

    const anonHash = sha256(anonKey);
    const serviceHash = sha256(serviceKey);

    // Ensure api_keys table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
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
        )
    `);

    // Upsert anon key
    await pool.query(`
        INSERT INTO api_keys (project_id, key_type, key_hash, key_prefix)
        VALUES ($1, 'anon', $2, $3)
        ON CONFLICT (project_id, key_type) DO UPDATE
        SET key_hash = EXCLUDED.key_hash, key_prefix = EXCLUDED.key_prefix, created_at = NOW()
    `, [projectId, anonHash, anonKey.substring(0, 16) + '...']);

    // Upsert service_role key
    await pool.query(`
        INSERT INTO api_keys (project_id, key_type, key_hash, key_prefix)
        VALUES ($1, 'service_role', $2, $3)
        ON CONFLICT (project_id, key_type) DO UPDATE
        SET key_hash = EXCLUDED.key_hash, key_prefix = EXCLUDED.key_prefix, created_at = NOW()
    `, [projectId, serviceHash, serviceKey.substring(0, 16) + '...']);

    console.log('✅ API Keys Generated!\n');
    console.log('⚠️  SAVE THESE KEYS NOW - You will not see them again!\n');
    console.log('─────────────────────────────────────────────────────');
    console.log('ANON KEY (public, read-only):');
    console.log(`  ${anonKey}`);
    console.log('');
    console.log('SERVICE ROLE KEY (secret, full access):');
    console.log(`  ${serviceKey}`);
    console.log('─────────────────────────────────────────────────────\n');
    console.log('Usage in API calls:');
    console.log('  Authorization: Bearer <key>');
}

async function main() {
    const args = process.argv.slice(2);
    const projectId = parseInt(args[0] || '1');

    if (isNaN(projectId)) {
        console.error('Usage: npx tsx scripts/gen_service_key.ts [projectId]');
        process.exit(1);
    }

    try {
        await createServiceKey(projectId);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
