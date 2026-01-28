import { Pool } from 'pg';

const globalForDb = globalThis as unknown as {
    pool: Pool | undefined;
};

const pool = globalForDb.pool ?? new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
