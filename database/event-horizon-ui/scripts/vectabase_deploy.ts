
import { Pool } from 'pg';
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

async function deployFile(projectId: number, funcName: string, filePath: string) {
    console.log(`🚀 Deploying "${funcName}" from ${filePath}...`);

    // Read local file
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');

    // Sync with DB
    const slug = funcName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const funcResult = await query(`
        INSERT INTO edge_functions (project_id, name, slug, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (project_id, slug) DO UPDATE SET updated_at = NOW()
        RETURNING id
    `, [projectId, funcName, slug]);

    const funcId = funcResult.rows[0].id;
    const fileName = path.basename(filePath);

    await query(`
        INSERT INTO edge_function_files (function_id, path, content, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (function_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `, [funcId, fileName, content]);

    console.log(`✅ Success! Deployed ${fileName} to function "${funcName}"`);
}

async function main() {
    try {
        const args = process.argv.slice(2);
        if (args.length < 3) {
            console.log("Usage: npx tsx scripts/vectabase_deploy.ts [projectId] [functionName] [filePath]");
            process.exit(1);
        }

        const projectId = parseInt(args[0]);
        const funcName = args[1];
        const filePath = args[2];

        await deployFile(projectId, funcName, filePath);
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

main();
