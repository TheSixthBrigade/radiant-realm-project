import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);

    if (!auth.authorized) {
        return NextResponse.json({
            authorized: false,
            error: auth.error || 'Unauthorized'
        }, { status: 401 });
    }

    try {
        // If it's an API key, we return project info
        if (auth.method === 'api_key' && auth.projectId) {
            const projectRes = await query(`
                SELECT p.id, p.name, p.slug, o.name as org_name, o.slug as org_slug
                FROM projects p
                JOIN organizations o ON p.org_id = o.id
                WHERE p.id = $1
            `, [auth.projectId]);

            return NextResponse.json({
                authorized: true,
                method: 'api_key',
                isAdmin: auth.isAdmin,
                project: projectRes.rows[0]
            });
        }

        // If it's a session, we return user info + their entities
        if (auth.method === 'session') {
            // Handle Lattice admin sessions
            if ((auth as any).isLatticeAdmin) {
                return NextResponse.json({
                    authorized: true,
                    method: 'session',
                    isAdmin: true,
                    isLatticeAdmin: true,
                    user: {
                        id: auth.userId || 0,
                        email: 'lattice-admin@vectabase.internal',
                        name: 'Lattice Admin',
                        identity_id: 'lattice:master-admin'
                    },
                    organizations: [] // Lattice admin can see all orgs via UI
                });
            }

            const userRes = await query('SELECT id, email, name, identity_id FROM users WHERE id = $1', [auth.userId]);
            const orgsRes = await query('SELECT id, name, slug FROM organizations WHERE owner_id = $1', [auth.userId]);

            return NextResponse.json({
                authorized: true,
                method: 'session',
                isAdmin: auth.isAdmin,
                user: userRes.rows[0],
                organizations: orgsRes.rows
            });
        }

        return NextResponse.json({ authorized: true, method: auth.method });
    } catch (error: any) {
        console.error('[Verify API] 500 Error:', error.message);
        console.error(error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
