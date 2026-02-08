import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';

// Lattice master key for emergency admin access
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY || 'vectabase-lattice-2026-master-key';

/**
 * POST /api/auth/lattice
 * Authenticate with Lattice recovery key for emergency admin access
 */
export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json();

        if (!key) {
            return NextResponse.json({ error: 'Lattice key is required' }, { status: 400 });
        }

        // Verify the lattice key
        if (key !== LATTICE_MASTER_KEY) {
            // Log failed attempt
            console.warn('Failed Lattice key attempt');
            return NextResponse.json({ error: 'Invalid Lattice key' }, { status: 401 });
        }

        // Create admin session
        const jwtSecret = (process.env.JWT_SECRET || process.env.DB_PASSWORD || 'postgres').trim();
        const secret = new TextEncoder().encode(jwtSecret);
        
        // Create a special admin identity for lattice access
        const latticeIdentity = {
            email: 'lattice-admin@vectabase.internal',
            id: 'lattice:master-admin',
            name: 'Lattice Admin'
        };

        // Ensure lattice admin user exists in DB
        try {
            await query(`
                INSERT INTO users (email, name, identity_id, provider)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO UPDATE 
                SET identity_id = EXCLUDED.identity_id
                RETURNING id
            `, [latticeIdentity.email, latticeIdentity.name, latticeIdentity.id, 'lattice']);

            // Ensure lattice admin has Owner permission
            await query(`
                INSERT INTO permissions (email, access_level)
                VALUES ($1, $2)
                ON CONFLICT (email) DO UPDATE SET access_level = EXCLUDED.access_level
            `, [latticeIdentity.email, 'Owner']);
        } catch (dbErr) {
            console.error('Lattice DB setup error:', dbErr);
        }

        // Create JWT token
        const jwt = await new SignJWT({ 
            email: latticeIdentity.email, 
            id: latticeIdentity.id,
            isLatticeAdmin: true 
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // Set both session cookie and lattice admin cookie
        const response = NextResponse.json({ 
            success: true, 
            message: 'Lattice authentication successful',
            redirectTo: '/'
        });

        response.cookies.set('pqc_session', jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        // Also set lattice admin cookie for proxy bypass
        response.cookies.set('lattice_admin', LATTICE_MASTER_KEY, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Lattice auth error:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}

/**
 * GET /api/auth/lattice
 * Get the current Lattice master key (admin only, for display)
 */
export async function GET(req: NextRequest) {
    // Only return the key to authenticated admins
    const token = req.cookies.get('pqc_session')?.value;
    
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { jwtVerify } = await import('jose');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        
        const adminEmails = ['thecheesemanatyou@gmail.com', 'maxedwardcheetham@gmail.com'];
        
        if (!adminEmails.includes(payload.email as string) && !payload.isLatticeAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ 
            key: LATTICE_MASTER_KEY,
            hint: 'This is your emergency admin access key. Keep it safe!'
        });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
