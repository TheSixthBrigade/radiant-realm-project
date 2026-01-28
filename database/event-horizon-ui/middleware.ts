import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Admin emails that are allowed to access the database UI
const ADMIN_EMAILS = [
  'thecheesemanatyou@gmail.com',
  'maxedwardcheetham@gmail.com'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public assets and API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // files like favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/login' || pathname === '/database/login') {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get('pqc_session')?.value;
  
  if (!token) {
    // No session - redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
    const { payload } = await jwtVerify(token, secret);
    
    const userEmail = payload.email as string;
    
    // Check if user is an admin
    if (!ADMIN_EMAILS.includes(userEmail)) {
      // Not an admin - return 404 page
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Page Not Found</title>
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
    }
    h1 {
      font-size: 8rem;
      font-weight: 900;
      background: linear-gradient(135deg, #3ecf8e 0%, #1a8f5c 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 1.5rem;
      color: #666;
      margin-bottom: 2rem;
      font-weight: 400;
    }
    p {
      color: #444;
      margin-bottom: 2rem;
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
    }
    a:hover {
      background: #34b27b;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <h2>Oops! Page not found</h2>
    <p>The page you're looking for doesn't exist or has been moved.</p>
    <a href="https://vectabase.com">Go to Homepage</a>
  </div>
</body>
</html>`,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // Admin user - allow access
    return NextResponse.next();
  } catch (error) {
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid cookie
    response.cookies.delete('pqc_session');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
