import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
import { sha256 } from '@/lib/crypto';

/**
 * GET /api/auth/sso?domain=company.com
 * Enterprise SSO authentication - domain-based login
 * 
 * Checks if the domain has SSO configured and redirects appropriately.
 */
export async function GET(req: NextRequest) {
    const domain = req.nextUrl.searchParams.get('domain');
    
    if (!domain) {
        return NextResponse.redirect(new URL('/login?error=missing_domain', req.url));
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim();
    
    try {
        // Check if this domain has SSO configured
        const ssoConfig = await query(`
            SELECT * FROM sso_configurations 
            WHERE domain = $1 AND enabled = true
        `, [normalizedDomain]).catch(() => ({ rows: [] }));

        if (ssoConfig.rows.length > 0) {
            const config = ssoConfig.rows[0];
            
            // If email/password SSO (for domains like privateemail)
            if (config.idp_type === 'email') {
                // Redirect to login page with SSO email mode
                return NextResponse.redirect(new URL(`/login?sso_email=true&domain=${encodeURIComponent(normalizedDomain)}`, req.url));
            }
            
            // If SAML/OIDC is configured with custom IdP URL, redirect there
            if (config.idp_url && config.idp_type !== 'google') {
                // In production, this would build a proper SAML AuthnRequest
                return NextResponse.redirect(config.idp_url);
            }
            
            // For Google-based SSO, redirect to Google OAuth with domain hint
            const googleAuthUrl = new URL('/api/auth/google', req.url);
            googleAuthUrl.searchParams.set('hd', normalizedDomain);
            googleAuthUrl.searchParams.set('sso_domain', normalizedDomain);
            
            return NextResponse.redirect(googleAuthUrl);
        }

        // No SSO config found - show error
        return NextResponse.redirect(new URL(`/login?error=sso_not_configured&domain=${encodeURIComponent(normalizedDomain)}`, req.url));

    } catch (error) {
        console.error('SSO error:', error);
        return NextResponse.redirect(new URL('/login?error=sso_failed', req.url));
    }
}

/**
 * POST /api/auth/sso
 * Handle SSO email/password login or callback from IdP
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, name, provider, ssoDomain, action } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Extract domain from email
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const domainToCheck = ssoDomain || emailDomain;
        
        if (!domainToCheck) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Check if domain has SSO configured
        const ssoConfig = await query(`
            SELECT * FROM sso_configurations 
            WHERE domain = $1 AND enabled = true
        `, [domainToCheck]).catch(() => ({ rows: [] }));

        if (ssoConfig.rows.length === 0) {
            return NextResponse.json({ 
                error: 'SSO not configured for this domain',
                domain: domainToCheck 
            }, { status: 403 });
        }

        const config = ssoConfig.rows[0];

        // Check if user's email domain matches the SSO domain
        if (emailDomain !== domainToCheck) {
            return NextResponse.json({ 
                error: 'Email domain does not match SSO configuration',
                expected: domainToCheck,
                got: emailDomain
            }, { status: 403 });
        }

        // Handle email/password SSO
        if (config.idp_type === 'email') {
            // Check if user exists
            const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (existingUser.rows.length > 0) {
                const user = existingUser.rows[0];
                
                // If user has no password set, they need to set one
                if (!user.password_hash) {
                    if (action === 'set_password' && password) {
                        // Set the password for first time using sha256
                        const salt = `vectabase-sso-${user.id}-${Date.now()}`;
                        const hashedPassword = sha256(password + salt);
                        await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [`${salt}:${hashedPassword}`, user.id]);
                        
                        // Create session
                        return await createSSOSession(email, user.name || email.split('@')[0], domainToCheck);
                    }
                    
                    return NextResponse.json({ 
                        requiresPasswordSetup: true,
                        message: 'Please set your password for first-time login'
                    }, { status: 200 });
                }
                
                // Verify password
                if (!password) {
                    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
                }
                
                // Extract salt and hash from stored password
                const [salt, storedHash] = user.password_hash.split(':');
                const inputHash = sha256(password + salt);
                
                if (inputHash !== storedHash) {
                    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
                }
                
                // Update last login
                await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);
                
                // Create session
                return await createSSOSession(email, user.name || email.split('@')[0], domainToCheck);
                
            } else if (config.auto_provision_users) {
                // Create new user without password (they'll set it on first login)
                const newUser = await query(`
                    INSERT INTO users (email, name, provider, identity_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, name
                `, [email, name || email.split('@')[0], 'sso', `sso:${email}`]);
                
                const userId = newUser.rows[0].id;

                // If allowed_project_ids is set, add user to those projects
                if (config.allowed_project_ids && config.allowed_project_ids.length > 0) {
                    for (const projectId of config.allowed_project_ids) {
                        await query(`
                            INSERT INTO project_users (project_id, user_id, role)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (project_id, user_id) DO NOTHING
                        `, [projectId, userId, config.default_role || 'Member']).catch(() => {});
                    }
                }
                
                // New user needs to set password
                if (action === 'set_password' && password) {
                    const salt = `vectabase-sso-${userId}-${Date.now()}`;
                    const hashedPassword = sha256(password + salt);
                    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [`${salt}:${hashedPassword}`, userId]);
                    
                    return await createSSOSession(email, newUser.rows[0].name, domainToCheck);
                }
                
                return NextResponse.json({ 
                    requiresPasswordSetup: true,
                    message: 'Account created! Please set your password.'
                }, { status: 200 });
            } else {
                return NextResponse.json({ 
                    error: 'User not found and auto-provisioning is disabled',
                    email 
                }, { status: 403 });
            }
        }

        // Handle OAuth-based SSO callback (Google, etc.)
        let userId: number;
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
            // Update last login
            await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [userId]);
        } else if (config.auto_provision_users) {
            // Create new user
            const newUser = await query(`
                INSERT INTO users (email, name, provider, identity_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [email, name || email.split('@')[0], provider || 'sso', `sso:${email}`]);
            userId = newUser.rows[0].id;

            // If allowed_project_ids is set, add user to those projects
            if (config.allowed_project_ids && config.allowed_project_ids.length > 0) {
                for (const projectId of config.allowed_project_ids) {
                    await query(`
                        INSERT INTO project_users (project_id, user_id, role)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (project_id, user_id) DO NOTHING
                    `, [projectId, userId, config.default_role || 'Member']).catch(() => {});
                }
            }
        } else {
            return NextResponse.json({ 
                error: 'User not found and auto-provisioning is disabled',
                email 
            }, { status: 403 });
        }

        return await createSSOSession(email, name || email.split('@')[0], domainToCheck);

    } catch (error: any) {
        console.error('SSO callback error:', error);
        return NextResponse.json({ error: 'SSO authentication failed' }, { status: 500 });
    }
}

async function createSSOSession(email: string, name: string, ssoDomain: string) {
    const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
    const jwt = await new SignJWT({ 
        email,
        id: `sso:${email}`,
        name,
        provider: 'sso',
        ssoDomain
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

    const response = NextResponse.json({ 
        success: true, 
        redirectTo: '/' 
    });

    response.cookies.set('pqc_session', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
    });

    return response;
}
