
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

async function ensureTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            table_name TEXT NOT NULL,
            event TEXT NOT NULL,
            target_url TEXT NOT NULL,
            secret TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, table_name, event, target_url)
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
        const result = await query('SELECT * FROM webhooks WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
        return NextResponse.json(result.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { projectId, table_name, event, target_url, secret } = await req.json();
        if (!projectId || !table_name || !event || !target_url) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureTable();

        const result = await query(`
            INSERT INTO webhooks (project_id, table_name, event, target_url, secret)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [projectId, table_name, event, target_url, secret]);

        return NextResponse.json(result.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id, projectId } = await req.json();
        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await query('DELETE FROM webhooks WHERE id = $1 AND project_id = $2', [id, projectId]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
