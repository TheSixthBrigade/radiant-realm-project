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

    try {
        const result = await query('SELECT id, name, slug FROM organizations WHERE owner_id = $1', [user.id]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

        const result = await query(`
            INSERT INTO organizations (name, slug, owner_id)
            VALUES ($1, $2, $3)
            RETURNING id, name, slug
        `, [name, slug, user.id]);

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
            return NextResponse.json({ error: 'An organization with this slug already exists.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
