import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

// Lattice master key for emergency admin access
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY || 'vectabase-lattice-2026-master-key';

/**
 * Check if the logged-in user has access to at least one project
 * This is used to determine if they can proceed past the login screen
 */
export async function GET(req: NextRequest) {
    // Check for Lattice admin cookie first
    const latticeToken = req.cookies.get('lattice_admin')?.value;
    if (latticeToken === LATTICE_MASTER_KEY) {
        return NextResponse.json({ 
            hasAccess: true, 
            isAdmin: true,
            isLatticeAdmin: true,
            email: 'lattice-admin@vectabase.internal'
        });
    }

    const token = req.cookies.get('pqc_session')?.value;
    
    if (!token) {
        return NextResponse.json({ hasAccess: false, reason: 'not_authenticated' });
    }

    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);

        // Check if this is a Lattice admin JWT
        if (payload.isLatticeAdmin) {
            return NextResponse.json({ 
                hasAccess: true, 
                isAdmin: true,
                isLatticeAdmin: true,
                email: payload.email
            });
        }

        // Get user from database - try by email first (more reliable), then by identity_id
        let userResult = await query('SELECT id, email FROM users WHERE email = $1', [payload.email]);
        
        // Fallback to identity_id if email lookup fails
        if (userResult.rows.length === 0 && payload.id) {
            userResult = await query('SELECT id, email FROM users WHERE identity_id = $1', [payload.id]);
        }
        
        if (userResult.rows.length === 0) {
            return NextResponse.json({ hasAccess: false, reason: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // Check if user is admin - admins always have access
        const isAdmin = user.email === 'thecheesemanatyou@gmail.com' || user.email === 'maxedwardcheetham@gmail.com';
        
        if (isAdmin) {
            return NextResponse.json({ 
                hasAccess: true, 
                isAdmin: true,
                email: user.email 
            });
        }

        // Check if user owns any organization OR has access to any project
        const accessCheck = await query(`
            SELECT 1 FROM organizations WHERE owner_id = $1
            UNION
            SELECT 1 FROM project_users WHERE user_id = $1
            LIMIT 1
        `, [user.id]);

        if (accessCheck.rows.length > 0) {
            return NextResponse.json({ 
                hasAccess: true, 
                isAdmin: false,
                email: user.email 
            });
        }

        // User has no access to any projects
        return NextResponse.json({ 
            hasAccess: false, 
            reason: 'no_project_access',
            email: user.email,
            message: 'You do not have access to any projects. Please contact an administrator.'
        });

    } catch (error: any) {
        console.error('Access check error:', error);
        return NextResponse.json({ 
            hasAccess: false, 
            reason: 'token_invalid',
            error: error.message 
        });
    }
}
