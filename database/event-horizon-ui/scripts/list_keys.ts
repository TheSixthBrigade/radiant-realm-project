
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

async function listKeys() {
    console.log('--- Current API Keys in Database ---');
    const res = await pool.query('SELECT project_id, key_type, key_hash, created_at FROM api_keys ORDER BY created_at DESC');
    console.table(res.rows);
}

listKeys().finally(() => pool.end());
