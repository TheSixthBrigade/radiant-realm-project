
import { sha256 } from './lib/crypto';
import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function debugKey(testKey: string) {
    const hash = sha256(testKey);
    console.log(`Key: ${testKey}`);
    console.log(`Hash: ${hash}`);

    const res = await pool.query('SELECT project_id, key_type FROM api_keys WHERE key_hash = $1', [hash]);
    if (res.rows.length > 0) {
        console.log('✅ KEY FOUND IN DATABASE!');
        console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
        console.log('❌ KEY NOT FOUND IN DATABASE.');

        // Let's see some hashes that DO exist
        const allKeys = await pool.query('SELECT project_id, key_type, LEFT(key_hash, 10) as prefix FROM api_keys LIMIT 5');
        console.log('Existing hash prefixes:', allKeys.rows);
    }
}

const keyToTest = process.argv[2];
if (!keyToTest) {
    console.log('Usage: npx tsx scripts/debug_auth.ts <key>');
    process.exit(1);
}

debugKey(keyToTest).finally(() => pool.end());
