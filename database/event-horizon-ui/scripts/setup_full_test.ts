
import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const query = (text: string, params?: any[]) => pool.query(text, params);

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
    try {
        console.log('--- STARTING TURBO SETUP ---');

        // 1. Create Organization
        let orgId;
        const orgRes = await query(`
            INSERT INTO organizations (name, slug, owner_id)
            VALUES ('TestOrg', 'test-org', (SELECT id FROM users LIMIT 1))
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name
        `);
        orgId = orgRes.rows[0].id;
        console.log(`Organization: ${orgRes.rows[0].name} (${orgId})`);

        // 2. Create Project
        let projectId;
        const projRes = await query(`
            INSERT INTO projects (name, slug, org_id)
            VALUES ('Web Test', 'web-test', $1)
            ON CONFLICT (slug, org_id) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name, slug
        `, [orgId]);
        projectId = projRes.rows[0].id;
        console.log(`Project: ${projRes.rows[0].name} (${projectId})`);

        // 3. Generate Keys
        const randomPart = crypto.randomBytes(32).toString('base64url');
        const key = `eyJh${projectId}._def_.pqc_v1_anon_${randomPart}`;
        const hash = sha256(key);

        await query(`
            INSERT INTO api_keys (project_id, key_type, key_hash, created_at)
            VALUES ($1, 'anon', $2, NOW())
        `, [projectId, hash]);
        console.log('Generated New API Key.');

        // 4. Create Tables
        await query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                author_email TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Schema Initialized.');

        // 5. Update App.tsx
        const appPath = path.resolve('..', 'vectabase-test-app', 'src', 'App.tsx');
        if (fs.existsSync(appPath)) {
            let content = fs.readFileSync(appPath, 'utf8');

            // Replace Key
            content = content.replace(/const PROJECT_API_KEY = '.*'/, `const PROJECT_API_KEY = '${key}'`);

            // Replace URL if needed (ensure it's localhost:3000)
            content = content.replace(/const VECTABASE_URL = '.*'/, `const VECTABASE_URL = 'http://localhost:3000'`);

            fs.writeFileSync(appPath, content);
            console.log('Updated vectabase-test-app/src/App.tsx with new configuration.');
        } else {
            console.error('Could not find App.tsx at ' + appPath);
        }

    } catch (e) {
        console.error('Setup failed:', e);
    } finally {
        await pool.end();
    }
}

main();
