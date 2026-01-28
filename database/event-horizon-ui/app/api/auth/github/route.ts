import { NextResponse } from 'next/server';

export async function GET() {
    const rootUrl = 'https://github.com/login/oauth/authorize';

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
    const clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
    const redirectUri = `${siteUrl}/api/auth/callback?provider=github`;

    console.log("--- GITHUB OAUTH START ---");
    console.log("CLIENT_ID:", clientId);
    console.log("REDIRECT_URI:", redirectUri);
    console.log("---------------------------");

    const options = {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        allow_signup: 'true',
    };

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}
