
import { Pool } from 'pg';
import crypto from 'crypto';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function createServiceKey(projectId: number) {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    const key = `eyJh${projectId}._def_.pqc_v1_service_${randomPart}`;
    const hash = sha256(key);

    await pool.query(`
        INSERT INTO api_keys (project_id, key_type, key_hash, created_at)
        VALUES ($1, 'service_role', $2, NOW())
    `, [projectId, hash]);

    console.log('--- NEW SERVICE ROLE KEY CREATED ---');
    console.log('Key: ' + key);
    console.log('Project ID: ' + projectId);
    console.log('Type: service_role');
}

createServiceKey(5).finally(() => pool.end());
