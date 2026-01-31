const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function createSSOTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS sso_configurations (
                id SERIAL PRIMARY KEY,
                domain TEXT UNIQUE NOT NULL,
                enabled BOOLEAN DEFAULT true,
                idp_type TEXT DEFAULT 'google',
                idp_url TEXT,
                idp_issuer TEXT,
                idp_certificate TEXT,
                client_id TEXT,
                client_secret TEXT,
                auto_provision_users BOOLEAN DEFAULT true,
                default_role TEXT DEFAULT 'Member',
                allowed_project_ids INTEGER[],
                created_by INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✅ SSO configurations table created successfully!');
    } catch (err) {
        console.error('Error creating table:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createSSOTable();
