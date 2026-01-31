import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears all authentication cookies and invalidates the session
 */
export async function POST(req: NextRequest) {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear all auth cookies by setting them to expire immediately
    response.cookies.set('pqc_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0)
    });
    
    response.cookies.set('lattice_admin', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0)
    });

    // Clear any other potential session cookies
    response.cookies.set('session', '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0)
    });

    return response;
}

/**
 * GET /api/auth/logout
 * Alternative logout via GET (for simple redirects)
 */
export async function GET(req: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(new URL('/login', baseUrl));
    
    // Clear all auth cookies
    response.cookies.set('pqc_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0)
    });
    
    response.cookies.set('lattice_admin', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        expires: new Date(0)
    });

    return response;
}
