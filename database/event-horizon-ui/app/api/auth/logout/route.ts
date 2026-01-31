import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears all authentication cookies and invalidates the session
 */
export async function POST(req: NextRequest) {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear all auth cookies by setting them to expire immediately
    // Use multiple methods to ensure cookies are cleared
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: -1,
        path: '/',
        expires: new Date(0)
    };
    
    response.cookies.set('pqc_session', '', cookieOptions);
    response.cookies.set('lattice_admin', '', cookieOptions);
    response.cookies.set('session', '', { ...cookieOptions, httpOnly: false });
    
    // Also delete cookies (alternative method)
    response.cookies.delete('pqc_session');
    response.cookies.delete('lattice_admin');
    response.cookies.delete('session');

    // Set cache control to prevent caching of auth state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
}

/**
 * GET /api/auth/logout
 * Alternative logout via GET (for simple redirects)
 */
export async function GET(req: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(new URL('/login?logged_out=true', baseUrl));
    
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: -1,
        path: '/',
        expires: new Date(0)
    };
    
    response.cookies.set('pqc_session', '', cookieOptions);
    response.cookies.set('lattice_admin', '', cookieOptions);
    response.cookies.delete('pqc_session');
    response.cookies.delete('lattice_admin');
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
}
