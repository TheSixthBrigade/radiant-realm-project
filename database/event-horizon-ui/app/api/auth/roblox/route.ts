import { NextResponse } from 'next/server';

export async function GET() {
    const rootUrl = 'https://apis.roblox.com/oauth/v1/authorize';

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
    const clientId = (process.env.ROBLOX_CLIENT_ID || '').trim();
    const redirectUri = `${siteUrl}/api/auth/callback?provider=roblox`;

    console.log("--- ROBLOX OAUTH START ---");
    console.log("CLIENT_ID:", clientId);
    console.log("REDIRECT_URI:", redirectUri);
    console.log("---------------------------");

    const options = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile',
        prompt: 'select_account',
    };

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}
