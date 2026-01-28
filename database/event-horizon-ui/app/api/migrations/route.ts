import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

/**
 * Migration tracking for Vectabase CLI
 */

async function ensureMigrationsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS _vectabase_migrations (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            hash TEXT NOT NULL,
            executed_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, filename)
        )
    `);
}

export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized || !auth.projectId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureMigrationsTable();
        const result = await query(
            'SELECT filename, hash, executed_at FROM _vectabase_migrations WHERE project_id = $1 ORDER BY filename ASC',
            [auth.projectId]
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized || !auth.projectId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { filename, hash } = await req.json();
        if (!filename || !hash) return NextResponse.json({ error: 'Filename and hash required' }, { status: 400 });

        await ensureMigrationsTable();
        await query(
            'INSERT INTO _vectabase_migrations (project_id, filename, hash) VALUES ($1, $2, $3) ON CONFLICT (project_id, filename) DO UPDATE SET hash = $3, executed_at = NOW()',
            [auth.projectId, filename, hash]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
