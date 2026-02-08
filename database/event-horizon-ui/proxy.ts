import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Admin emails that have full access to the database UI
const ADMIN_EMAILS = [
    'thecheesemanatyou@gmail.com',
    'maxedwardcheetham@gmail.com'
];

// Lattice master key for emergency admin access — disabled if env var not set
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY;

export default async function proxy(request: NextRequest) {
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
    const latticeToken = request.cookies.get('lattice_admin')?.value;
    const authHeader = request.headers.get('Authorization');

    // Check for Lattice admin token (backup admin access) — only if env var is set
    if (LATTICE_MASTER_KEY && latticeToken === LATTICE_MASTER_KEY) {
        return addCors(NextResponse.next());
    }

    // Public / Auth / Excluded routes
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/v1') || // EXEMPT EXTERNAL API
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico' ||
        pathname.includes('.')  // Static files
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

    // Session-based auth check (not API keys)
    if (token && !authHeader) {
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                // JWT_SECRET not configured — can't verify session
                const loginUrl = new URL('/login', request.url);
                return addCors(NextResponse.redirect(loginUrl));
            }
            const secret = new TextEncoder().encode(jwtSecret);
            const { payload } = await jwtVerify(token, secret);
            
            const userEmail = payload.email as string;
            
            // Admins always have access
            if (ADMIN_EMAILS.includes(userEmail)) {
                return addCors(NextResponse.next());
            }
            
            // For non-admins, check permissions in real-time (no caching)
            // This ensures permission changes take effect immediately
            try {
                const checkUrl = new URL('/api/auth/check-access', request.url);
                const checkRes = await fetch(checkUrl.toString(), {
                    headers: {
                        Cookie: `pqc_session=${token}`
                    }
                });
                
                if (checkRes.ok) {
                    const data = await checkRes.json();
                    
                    if (data.hasAccess) {
                        return addCors(NextResponse.next());
                    }
                }
            } catch (e) {
                // If check fails, deny access (fail closed for security)
                console.error('Access check failed:', e);
            }
            
            // User doesn't have access - show access denied page
            return new NextResponse(
                `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied - Vectabase</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d0d0d;
      font-family: system-ui, -apple-system, sans-serif;
      color: #ededed;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 1rem;
      color: #666;
      margin-bottom: 2rem;
      font-weight: 400;
      line-height: 1.6;
    }
    .email {
      color: #3ecf8e;
      font-family: monospace;
      background: rgba(62, 207, 142, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    a {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #3ecf8e;
      color: #000;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.2s;
      margin: 0.5rem;
    }
    a:hover {
      background: #34b27b;
      transform: translateY(-2px);
    }
    a.secondary {
      background: transparent;
      border: 1px solid #333;
      color: #888;
    }
    a.secondary:hover {
      border-color: #555;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>Access Denied</h1>
    <h2>
      You're logged in as <span class="email">${userEmail}</span> but you don't have access to any projects.
      <br><br>
      Please contact an administrator to get access.
    </h2>
    <a href="/login" onclick="document.cookie='pqc_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'">Sign Out</a>
    <a href="https://vectabase.com" class="secondary">Go to Homepage</a>
  </div>
</body>
</html>`,
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'text/html',
                    },
                }
            );
        } catch (error) {
            // Invalid token - redirect to login
            const loginUrl = new URL('/login', request.url);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('pqc_session');
            return addCors(response);
        }
    }

    return addCors(NextResponse.next());
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
