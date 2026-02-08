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

    try {
        // If admin (including Lattice), return ALL organizations
        if (isAdmin(user)) {
            const result = await query('SELECT id, name, slug, owner_id FROM organizations ORDER BY name');
            return NextResponse.json(result.rows);
        }

        // Return orgs where user is owner OR has project access
        const result = await query(`
            SELECT DISTINCT o.id, o.name, o.slug, o.owner_id
            FROM organizations o
            LEFT JOIN projects p ON p.org_id = o.id
            LEFT JOIN project_users pu ON pu.project_id = p.id
            WHERE o.owner_id = $1 OR pu.user_id = $1
            ORDER BY o.name
        `, [user.id]);
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

        // For Lattice admin, use a system owner or first admin user
        let ownerId = user.id;
        if (user.isLatticeAdmin) {
            const adminResult = await query(`SELECT id FROM users WHERE email = 'thecheesemanatyou@gmail.com' LIMIT 1`);
            ownerId = adminResult.rows[0]?.id || 1;
        }

        const result = await query(`
            INSERT INTO organizations (name, slug, owner_id)
            VALUES ($1, $2, $3)
            RETURNING id, name, slug
        `, [name, slug, ownerId]);

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
            return NextResponse.json({ error: 'An organization with this slug already exists.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
