const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function addPasswordHash() {
    try {
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT
        `);
        console.log('✅ password_hash column added to users table!');
        
        // Verify
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password_hash'
        `);
        console.log('Column info:', result.rows);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

addPasswordHash();
