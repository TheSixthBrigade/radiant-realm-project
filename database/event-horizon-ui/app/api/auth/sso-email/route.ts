import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SignJWT } from 'jose';
import { sha256 } from '@/lib/crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, password, domain, setupPassword } = await req.json();

        if (!email || !domain) {
            return NextResponse.json({ error: 'Email and domain required' }, { status: 400 });
        }

        // Verify domain is configured for SSO
        const ssoConfig = await query(
            'SELECT * FROM sso_configurations WHERE domain = $1 AND enabled = true',
            [domain]
        );

        if (ssoConfig.rows.length === 0) {
            return NextResponse.json({ error: 'SSO not configured for this domain' }, { status: 403 });
        }

        const config = ssoConfig.rows[0];

        // Check if email matches the domain
        const emailDomain = email.split('@')[1];
        if (emailDomain !== domain) {
            return NextResponse.json({ error: 'Email domain does not match SSO domain' }, { status: 403 });
        }

        // Check if this domain has any existing users (first user becomes admin)
        const existingDomainUsers = await query(
            `SELECT COUNT(*) as count FROM users WHERE email LIKE $1 AND provider = 'sso'`,
            [`%@${domain}`]
        );
        const isFirstUserForDomain = parseInt(existingDomainUsers.rows[0].count) === 0;

        // Check if user exists
        let userResult = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        let user = userResult.rows[0];

        if (!user) {
            // For non-first users, check if auto-provisioning is enabled OR if they were invited
            if (!isFirstUserForDomain && !config.auto_provision_users) {
                // Check if user was invited by domain admin
                const inviteCheck = await query(
                    'SELECT * FROM sso_invites WHERE email = $1 AND domain = $2 AND used_at IS NULL AND expires_at > NOW()',
                    [email, domain]
                );
                
                if (inviteCheck.rows.length === 0) {
                    return NextResponse.json({ 
                        error: 'You must be invited by your domain administrator to access this system',
                        requiresInvite: true 
                    }, { status: 403 });
                }
                
                // Mark invite as used
                await query('UPDATE sso_invites SET used_at = NOW() WHERE id = $1', [inviteCheck.rows[0].id]);
            }

            // Create new user - they need to set password on first login
            const identityId = `sso:${domain}:${Date.now()}`;
            const role = isFirstUserForDomain ? 'domain_admin' : (config.default_role || 'Member');
            
            const newUserResult = await query(
                `INSERT INTO users (email, identity_id, name, provider, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [email, identityId, email.split('@')[0], 'sso']
            );
            user = newUserResult.rows[0];
            
            // If first user, make them the domain admin
            if (isFirstUserForDomain) {
                await query(
                    'UPDATE sso_configurations SET created_by = $1 WHERE id = $2',
                    [user.id, config.id]
                );
                
                // Add to permissions as domain admin
                await query(
                    `INSERT INTO permissions (email, access_level, created_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (email) DO UPDATE SET access_level = $2`,
                    [email, 'DomainAdmin']
                );
            }

            // Grant access to allowed projects
            if (config.allowed_project_ids && config.allowed_project_ids.length > 0) {
                for (const projectId of config.allowed_project_ids) {
                    await query(
                        `INSERT INTO project_users (project_id, user_id, role, created_at)
                         VALUES ($1, $2, $3, NOW())
                         ON CONFLICT (project_id, user_id) DO NOTHING`,
                        [projectId, user.id, config.default_role || 'Member']
                    );
                }
            }

            // New user needs to set password
            return NextResponse.json({ 
                requiresPasswordSetup: true,
                message: 'Please set your password'
            });
        }

        // User exists - check if they have a password set
        if (!user.password_hash) {
            if (setupPassword && password) {
                // Setting password for first time - use simple hash
                if (password.length < 8) {
                    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
                }

                // Simple password hash using sha256 with salt
                const salt = `vectabase-sso-${user.id}-${Date.now()}`;
                const hashedPassword = sha256(password + salt);
                await query(
                    'UPDATE users SET password_hash = $1 WHERE id = $2',
                    [`${salt}:${hashedPassword}`, user.id]
                );
            } else {
                // Need to set password
                return NextResponse.json({ 
                    requiresPasswordSetup: true,
                    message: 'Please set your password'
                });
            }
        } else {
            // Verify password
            if (!password) {
                return NextResponse.json({ error: 'Password required' }, { status: 400 });
            }

            // Extract salt and hash from stored password
            const [salt, storedHash] = user.password_hash.split(':');
            const inputHash = sha256(password + salt);
            
            if (inputHash !== storedHash) {
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }
        }

        // Generate JWT token
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const token = await new SignJWT({
            id: user.identity_id,
            email: user.email,
            name: user.name,
            provider: user.provider || 'sso'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        // Create response with auth cookie
        const response = NextResponse.json({ 
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                provider: user.provider || 'sso'
            }
        });

        response.cookies.set('pqc_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('SSO email login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
