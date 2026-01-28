
import { Pool } from 'pg';
import crypto from 'crypto';

// Minimal DB and Crypto setup to avoid import issues with relative paths in script if tsconfig mapping fails
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your-super-secret-and-long-postgres-password',
});
const query = (text: string, params?: any[]) => pool.query(text, params);

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
    try {
        // 1. Get first project
        const pRes = await query('SELECT id, name FROM projects LIMIT 1');
        if (pRes.rows.length === 0) {
            console.log('No projects found. Create one in dashboard first.');
            process.exit(1);
        }
        const project = pRes.rows[0];
        console.log(`Found Project: ${project.name} (${project.id})`);

        // 2. Generate Key
        const randomPart = crypto.randomBytes(32).toString('base64url');
        const key = `eyJh${project.id}._def_.pqc_v1_anon_${randomPart}`;
        const hash = sha256(key);

        console.log('Generated Key: ' + key);
        console.log('Hash: ' + hash);

        // 3. Insert into api_keys
        await query(`
            INSERT INTO api_keys (project_id, key_type, key_hash, created_at)
            VALUES ($1, 'anon', $2, NOW())
        `, [project.id, hash]);

        console.log('Key inserted into api_keys!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
