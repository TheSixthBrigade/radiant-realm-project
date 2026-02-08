import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

// Lattice master key for emergency admin access — no hardcoded default
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY;

async function getUser(req: NextRequest) {
    // Check for Lattice admin first — only if env var is set
    if (LATTICE_MASTER_KEY) {
        const latticeToken = req.cookies.get('lattice_admin')?.value;
        if (latticeToken === LATTICE_MASTER_KEY) {
            return { id: 0, email: 'lattice-admin@vectabase.internal', isLatticeAdmin: true };
        }
    }

    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return null;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;

    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret);
        
        // Check if JWT is for Lattice admin
        if (payload.isLatticeAdmin) {
            return { id: 0, email: payload.email as string, isLatticeAdmin: true };
        }
        
        // FIXED: Look up by email, not identity_id, to match verifyAccess()
        const result = await query('SELECT id, email FROM users WHERE email = $1', [payload.email]);
        return result.rows[0] || null;
    } catch {
        return null;
    }
}

// Check if user is admin (includes Lattice admin)
function isAdmin(user: any) {
    if (user.isLatticeAdmin) return true;
    return user.email === 'thecheesemanatyou@gmail.com' || user.email === 'maxedwardcheetham@gmail.com';
}

export async function GET(req: NextRequest) {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) return NextResponse.json({ error: 'Org ID required' }, { status: 400 });

    try {
        // If admin (including Lattice), return ALL projects in org
        if (isAdmin(user)) {
            const result = await query('SELECT id, name, slug, org_id FROM projects WHERE org_id = $1 ORDER BY name', [orgId]);
            return NextResponse.json(result.rows);
        }

        // Return projects where user is org owner OR has direct project access
        const result = await query(`
            SELECT DISTINCT p.id, p.name, p.slug, p.org_id
            FROM projects p
            JOIN organizations o ON p.org_id = o.id
            LEFT JOIN project_users pu ON pu.project_id = p.id
            WHERE p.org_id = $1 AND (o.owner_id = $2 OR pu.user_id = $2)
            ORDER BY p.name
        `, [orgId, user.id]);
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

        // Lattice admin can create projects in any org
        if (!user.isLatticeAdmin) {
            // Verify ownership for non-Lattice users
            const orgCheck = await query('SELECT id FROM organizations WHERE id = $1 AND owner_id = $2', [orgId, user.id]);
            if (orgCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
