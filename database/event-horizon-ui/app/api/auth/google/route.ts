import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const redirectTo = searchParams.get('redirectTo');

    let clientId = '';

    if (projectId) {
        // Project-Specific Auth
        try {
            const config = await query("SELECT client_id FROM provider_configs WHERE provider_name = 'google' AND project_id = $1", [projectId]);
            if (config.rows.length > 0) {
                clientId = config.rows[0].client_id.trim();
            } else {
                return NextResponse.json({ error: 'Google OAuth is disabled for this project.' }, { status: 403 });
            }
        } catch (err) {
            console.error("Auth DB Error", err);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    } else {
        // Platform Auth (Global)
        clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    }

    // Double check if client ID works
    if (!clientId) {
        return NextResponse.json({ error: 'Google OAuth is not configured.' }, { status: 403 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
    const redirectUri = `${siteUrl}/api/auth/callback`;

    // Construct state
    const state = Buffer.from(JSON.stringify({ projectId, redirectTo })).toString('base64');

    console.log("--- GOOGLE OAUTH START ---");
    console.log("CLIENT_ID:", clientId);
    console.log("REDIRECT_URI:", redirectUri);
    console.log("STATE:", state);
    console.log("--------------------------");

    const options = {
        redirect_uri: redirectUri,
        client_id: clientId,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        state: state,
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
    };

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}
