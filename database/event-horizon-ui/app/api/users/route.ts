import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

async function verifyAccess(req: NextRequest, projectId?: string) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return { authorized: false };
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);

        // Root access for owner/hardcoded admin
        if (payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com') {
            const userRes = await query('SELECT id FROM users WHERE email = $1', [payload.email]);
            return { authorized: true, userId: userRes.rows[0].id };
        }

        const userRes = await query('SELECT id FROM users WHERE identity_id = $1', [payload.id]);
        if (userRes.rows.length === 0) return { authorized: false };
        const userId = userRes.rows[0].id;

        if (projectId) {
            const membership = await query('SELECT role FROM project_users WHERE user_id = $1 AND project_id = $2', [userId, projectId]);
            if (membership.rows.length === 0) return { authorized: false };
        }

        return { authorized: true, userId };
    } catch {
        return { authorized: false };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    // For now if no projectId, we might return all (for global admin) or empty
    const { authorized } = await verifyAccess(req, projectId || undefined);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let result;
        if (projectId) {
            result = await query(`
                SELECT u.id, u.email, u.name, u.identity_id, pu.created_at, pu.role, u.provider
                FROM users u
                JOIN project_users pu ON u.id = pu.user_id
                WHERE pu.project_id = $1
                ORDER BY pu.created_at DESC
            `, [projectId]);
        } else {
            // Global view for admins
            result = await query('SELECT id, email, name, identity_id, created_at, provider FROM users ORDER BY created_at DESC');
        }
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
