
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

async function ensureTable() {
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
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const { authorized } = await verifyAccess(req, projectId);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureTable();
        // Fetch functions
        const funcsResult = await query('SELECT * FROM edge_functions WHERE project_id = $1 ORDER BY name', [projectId]);
        const functions = funcsResult.rows;

        // Fetch files for each function
        for (const func of functions) {
            const filesResult = await query('SELECT path, content FROM edge_function_files WHERE function_id = $1', [func.id]);
            func.files = filesResult.rows;
        }

        return NextResponse.json(functions);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { projectId, name, files } = await req.json();
        if (!projectId || !name || !files || !Array.isArray(files)) {
            return NextResponse.json({ error: 'Missing fields (projectId, name, files[])' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureTable();

        const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        // 1. Upsert the function
        const funcResult = await query(`
            INSERT INTO edge_functions (project_id, name, slug, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (project_id, slug) DO UPDATE SET updated_at = NOW()
            RETURNING *
        `, [projectId, name, slug]);

        const func = funcResult.rows[0];

        // 2. Sync the files (for simplicity, we upsert each provided file)
        // In a real system, we might delete files not in the list
        for (const file of files) {
            await query(`
                INSERT INTO edge_function_files (function_id, path, content, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (function_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
            `, [func.id, file.path, file.content]);
        }

        // 3. Return the function with its files
        const finalFiles = await query('SELECT path, content FROM edge_function_files WHERE function_id = $1', [func.id]);
        func.files = finalFiles.rows;

        return NextResponse.json(func);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
