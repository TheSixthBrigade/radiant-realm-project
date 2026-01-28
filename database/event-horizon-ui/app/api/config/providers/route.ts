import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const { authorized } = await verifyAccess(req, projectId);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await query('SELECT provider_name, client_id, client_secret FROM provider_configs WHERE project_id = $1', [projectId]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { provider_name, client_id, client_secret, projectId } = await req.json();

        if (!projectId || !provider_name) return NextResponse.json({ error: 'Project ID and Provider Name are required' }, { status: 400 });

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await query(`
            INSERT INTO provider_configs (provider_name, client_id, client_secret, project_id, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (provider_name, project_id) DO UPDATE 
            SET client_id = EXCLUDED.client_id, client_secret = EXCLUDED.client_secret, updated_at = NOW()
        `, [provider_name, client_id, client_secret, projectId]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
