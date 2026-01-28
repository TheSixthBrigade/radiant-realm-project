
import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const query = (text: string, params?: any[]) => pool.query(text, params);

async function ensureTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS edge_functions (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            trigger_type TEXT DEFAULT 'http',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, slug)
        );

        CREATE TABLE IF NOT EXISTS edge_function_files (
            id SERIAL PRIMARY KEY,
            function_id INTEGER REFERENCES edge_functions(id) ON DELETE CASCADE,
            path TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(function_id, path)
        );
    `);
    console.log("Tables verified.");
}

async function deployAdvancedFunction(projectId: number, name: string, files: { path: string, content: string }[]) {
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log(`Deploying advanced function "${name}"...`);

    const funcResult = await query(`
        INSERT INTO edge_functions (project_id, name, slug, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (project_id, slug) DO UPDATE SET updated_at = NOW()
        RETURNING id
    `, [projectId, name, slug]);

    const funcId = funcResult.rows[0].id;

    for (const file of files) {
        await query(`
            INSERT INTO edge_function_files (function_id, path, content, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (function_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
        `, [funcId, file.path, file.content]);
    }

    console.log(`SUCCESS: "${name}" deployed with ${files.length} files.`);
}

const indexTs = `
// index.ts: Entry point for User Analytics
console.log("Initializing analytics...");

// 1. Fetch Users from DB
const users = await db.query("SELECT * FROM users");
const totalUsers = users.length;

// 2. Fetch Active Session count (mock)
const sessions = await db.query("SELECT count(*) FROM users WHERE identity_id IS NOT NULL");
const activeCount = parseInt(sessions[0].count);

// 3. Process with shared utility logic (simulated import)
const healthy = activeCount > 0 && totalUsers > 0;

console.log("Stats calculated:", { totalUsers, activeCount });

return {
    status: "success",
    metrics: {
        totalUsers,
        activeIdentities: activeCount,
        integrity: healthy ? "EXCELLENT" : "WARNING",
        timestamp: event.body.timestamp || new Date().toISOString()
    },
    projectContext: event.headers['host']
};
`;

const readme = `
User Analytics Function
---
Queries the project users table and returns real-time identity metrics.
`;

async function main() {
    try {
        await ensureTables();
        const projectId = 5; // Web Test project
        await deployAdvancedFunction(projectId, 'User Analytics', [
            { path: 'index.ts', content: indexTs },
            { path: 'README.md', content: readme }
        ]);
    } catch (e) {
        console.error('Deployment failed:', e);
    } finally {
        await pool.end();
    }
}

main();
