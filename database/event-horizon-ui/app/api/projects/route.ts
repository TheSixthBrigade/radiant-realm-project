import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

async function getUser(req: NextRequest) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        const result = await query('SELECT id FROM users WHERE identity_id = $1', [payload.id]);
        return result.rows[0];
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) return NextResponse.json({ error: 'Org ID required' }, { status: 400 });

    try {
        const result = await query('SELECT id, name, slug, org_id FROM projects WHERE org_id = $1', [orgId]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, orgId } = await req.json();
        if (!name || !orgId) return NextResponse.json({ error: 'Name and Org ID are required' }, { status: 400 });

        // Verify ownership
        const orgCheck = await query('SELECT id FROM organizations WHERE id = $1 AND owner_id = $2', [orgId, user.id]);
        if (orgCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

        const result = await query(`
            INSERT INTO projects (name, slug, org_id)
            VALUES ($1, $2, $3)
            RETURNING id, name, slug, org_id
        `, [name, slug, orgId]);

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
            return NextResponse.json({ error: 'A project with this slug already exists in this organization.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
