
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin') || '*';

    // Helper to add CORS to response
    const addCors = (res: NextResponse) => {
        if (pathname.startsWith('/api')) {
            res.headers.set('Access-Control-Allow-Origin', origin);
            res.headers.set('Access-Control-Allow-Credentials', 'true');
            res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        }
        return res;
    };

    // Handle Preflight
    if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
        return addCors(new NextResponse(null, { status: 200 }));
    }

    const token = request.cookies.get('pqc_session')?.value;
    const authHeader = request.headers.get('Authorization');

    // Public / Auth / Excluded routes
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/v1') || // EXEMPT EXTERNAL API
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico'
    ) {
        return addCors(NextResponse.next());
    }

    // Redirect to login if no auth
    if (!token && !authHeader) {
        // If it's an API call, return 401 instead of redirecting to login HTML
        if (pathname.startsWith('/api')) {
            return addCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }
        const url = new URL('/login', request.url);
        return addCors(NextResponse.redirect(url));
    }

    return addCors(NextResponse.next());
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
