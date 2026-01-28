import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SignJWT } from 'jose';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const provider = req.nextUrl.searchParams.get('provider') || 'google';
    let projectId = req.nextUrl.searchParams.get('projectId');
    let redirectTo = null;

    const state = req.nextUrl.searchParams.get('state');
    if (state) {
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            if (decoded.projectId) projectId = decoded.projectId;
            if (decoded.redirectTo) redirectTo = decoded.redirectTo;
            console.log("State Decoded:", { projectId, redirectTo });
        } catch (e) {
            console.error("State decode error", e);
        }
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
    const dbPassword = (process.env.DB_PASSWORD || 'postgres').trim();

    if (!code) {
        return NextResponse.redirect(`${siteUrl}/login?error=no_code`);
    }

    try {
        console.log(`--- ${provider.toUpperCase()} OAUTH CALLBACK START ---`);

        // Fetch keys from DB or fallback to Env
        let clientId = (process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '').trim();
        let clientSecret = (process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '').trim();

        try {
            console.log(`DB Sync: Fetching config for ${provider} (Project: ${projectId || 'Global'})...`);
            let config;
            if (projectId) {
                config = await query("SELECT client_id, client_secret FROM provider_configs WHERE provider_name = $1 AND project_id = $2", [provider, projectId]);
            }

            if (config && config.rows.length > 0) {
                clientId = config.rows[0].client_id.trim();
                clientSecret = config.rows[0].client_secret.trim();
                console.log(`Using Database Config for ${provider}`);
            } else {
                // Fallback to global/env config if project specific not found
                console.log(`Using Default/Env Config for ${provider}`);
            }
        } catch (dbErr) {
            console.error("Callback Error: Could not fetch DB config, falling back to Env", dbErr);
        }

        let accessToken = '';
        let userData: { email: string; name: string; id: string } = { email: '', name: '', id: '' };

        if (provider === 'google') {
            console.log("Exchanging Google code for tokens...");
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: `${siteUrl}/api/auth/callback`,
                    grant_type: 'authorization_code',
                }),
            });
            const tokens = await tokenResponse.json();
            if (tokens.error) throw new Error(`Google Token Error: ${tokens.error_description || tokens.error}`);
            accessToken = tokens.access_token;

            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user = await userRes.json();
            userData = { email: user.email, name: user.name, id: `google:${user.id}` };

        } else if (provider === 'github') {
            console.log("Exchanging GitHub code for tokens...");
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: `${siteUrl}/api/auth/callback?provider=github`,
                }),
            });
            const tokens = await tokenResponse.json();
            if (tokens.error) throw new Error(`GitHub Token Error: ${tokens.error_description || tokens.error}`);
            accessToken = tokens.access_token;

            const userRes = await fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user = await userRes.json();

            const emailRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const emails = await emailRes.json();
            const primaryEmail = emails.find((e: any) => e.primary)?.email || user.email;

            userData = { email: primaryEmail, name: user.name || user.login, id: `github:${user.id}` };

        } else if (provider === 'roblox') {
            console.log("Exchanging Roblox code for tokens...");
            const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'authorization_code',
                }),
            });
            const tokens = await tokenResponse.json();
            if (tokens.error) throw new Error(`Roblox Token Error: ${tokens.error_description || tokens.error}`);
            accessToken = tokens.access_token;

            const userRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user = await userRes.json();
            userData = { email: user.email || `${user.preferred_username}@roblox.com`, name: user.nickname || user.preferred_username, id: `roblox:${user.sub}` };
        }

        console.log("Verified Identity:", userData.email, userData.id);

        // 3. Save to OUR Postgres
        try {
            console.log("DB Sync: Ensuring provider_configs table...");
            await query(`
                CREATE TABLE IF NOT EXISTS provider_configs (
                    id SERIAL PRIMARY KEY,
                    provider_name TEXT NOT NULL,
                    project_id INTEGER REFERENCES projects(id),
                    client_id TEXT NOT NULL,
                    client_secret TEXT NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(provider_name, project_id)
                )
            `);

            console.log("DB Sync: Ensuring mapping tables...");
            await query(`
                CREATE TABLE IF NOT EXISTS project_users (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER REFERENCES projects(id),
                    user_id INTEGER REFERENCES users(id),
                    role TEXT DEFAULT 'Member',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(project_id, user_id)
                )
            `);

            // MIGRATION: Add project_id to provider_configs if it's missing
            await query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provider_configs' AND column_name='project_id') THEN
                        ALTER TABLE provider_configs ADD COLUMN project_id INTEGER REFERENCES projects(id);
                        ALTER TABLE provider_configs DROP CONSTRAINT IF EXISTS provider_configs_provider_name_key;
                        ALTER TABLE provider_configs ADD CONSTRAINT provider_configs_unique_provider_per_project UNIQUE (provider_name, project_id);
                    END IF;
                END $$;
            `);

            console.log("DB Sync: Checking permissions...");
            const permCheck = await query('SELECT access_level FROM permissions WHERE email = $1', [userData.email]);

            if (permCheck.rows.length === 0 && userData.email === 'thecheesemanatyou@gmail.com') {
                console.log("Owner detected. Self-authorizing...");
                await query('INSERT INTO permissions (email, access_level) VALUES ($1, $2)', [userData.email, 'Owner']);
            } else if (permCheck.rows.length === 0 && userData.email === 'maxedwardcheetham@gmail.com') {
                console.log("Admin detected. Self-authorizing...");
                await query('INSERT INTO permissions (email, access_level) VALUES ($1, $2)', [userData.email, 'Admin']);
            } else if (permCheck.rows.length === 0) {
                console.error("Access Denied: Email not authorized:", userData.email);
                return NextResponse.redirect(`${siteUrl}/login?error=unauthorized&msg=${encodeURIComponent("Access Denied: Your email is not on the authorized list.")}`);
            }

            console.log("DB Sync: UPSERTing user by email...");
            const userResult = await query(`
                INSERT INTO users (email, name, identity_id, provider)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO UPDATE 
                SET identity_id = EXCLUDED.identity_id, 
                    name = EXCLUDED.name,
                    provider = EXCLUDED.provider
                RETURNING id
            `, [userData.email, userData.name, userData.id, provider]);

            const userId = userResult.rows[0].id;
            console.log("DB Sync: User ID =", userId);

            // Link user to project if project context exists
            if (projectId) {
                console.log(`Linking user ${userId} to project ${projectId}...`);
                await query(`
                    INSERT INTO project_users (project_id, user_id)
                    VALUES ($1, $2)
                    ON CONFLICT (project_id, user_id) DO NOTHING
                `, [projectId, userId]);
            }

            // Ensure the owner has a default organization and project if it's their first login
            if (userData.email === 'thecheesemanatyou@gmail.com') {
                console.log("DB Sync: Owner detected, checking for default organization...");
                const orgs = await query('SELECT id FROM organizations WHERE owner_id = $1', [userId]);
                if (orgs.rows.length === 0) {
                    console.log("Creating default organization for owner...");
                    const newOrg = await query(`
                        INSERT INTO organizations (name, slug, owner_id)
                        VALUES ($1, $2, $3)
                        RETURNING id
                    `, ['Default Org', 'default-org', userId]);

                    const orgId = newOrg.rows[0].id;
                    console.log("Created Org ID =", orgId);

                    console.log("Creating initial project for owner...");
                    const newProject = await query(`
                        INSERT INTO projects (name, slug, org_id)
                        VALUES ($1, $2, $3)
                        RETURNING id
                    `, ['Main Project', 'main-project', orgId]);

                    const initialProjectId = newProject.rows[0].id;
                    await query(`
                        INSERT INTO project_users (project_id, user_id)
                        VALUES ($1, $2)
                    `, [initialProjectId, userId]);
                }
            }

            console.log("Database Sync: Success");
        } catch (dbError: any) {
            console.error("CRITICAL DB SYNC ERROR:", dbError.message);
            console.error("Detail:", dbError);
            throw new Error(`Database synchronization failed: ${dbError.message}`);
        }

        // 4. Create Session JWT
        const secret = new TextEncoder().encode(dbPassword);
        const jwt = await new SignJWT({ email: userData.email, id: userData.id })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // 5. Success redirect with cookie
        console.log("Auth Flow Success. Redirecting to:", redirectTo || `${siteUrl}/`);
        const response = NextResponse.redirect(redirectTo || `${siteUrl}/`);
        response.cookies.set('pqc_session', jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Final OAuth Error:', error.message);
        return NextResponse.redirect(`${siteUrl}/login?error=auth_failed&msg=${encodeURIComponent(error.message)}`);
    }
}
