import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { generateApiKey, sha256 } from '@/lib/crypto';

async function verifyAccess(req: NextRequest, projectId?: string) {
    // Check for Lattice admin first
    const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY || 'vectabase-lattice-2026-master-key';
    const latticeToken = req.cookies.get('lattice_admin')?.value;
    console.log('[API Keys] Lattice token present:', !!latticeToken);
    if (latticeToken === LATTICE_MASTER_KEY) {
        console.log('[API Keys] Lattice admin authorized');
        return { authorized: true, userId: 0, isLatticeAdmin: true };
    }

    const token = req.cookies.get('pqc_session')?.value;
    console.log('[API Keys] PQC session token present:', !!token);
    if (!token) {
        console.log('[API Keys] No token found - unauthorized');
        return { authorized: false };
    }
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        console.log('[API Keys] JWT payload:', JSON.stringify(payload));

        // Check if JWT is for Lattice admin
        if (payload.isLatticeAdmin) {
            console.log('[API Keys] JWT has isLatticeAdmin flag');
            return { authorized: true, userId: 0, isLatticeAdmin: true };
        }

        // Admin emails always have access
        if (payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com') {
            console.log('[API Keys] Admin email detected:', payload.email);
            const userRes = await query('SELECT id FROM users WHERE email = $1', [payload.email]);
            return { authorized: true, userId: userRes.rows[0]?.id };
        }

        const userRes = await query('SELECT id FROM users WHERE identity_id = $1', [payload.id]);
        console.log('[API Keys] User lookup by identity_id:', payload.id, 'found:', userRes.rows.length);
        if (userRes.rows.length === 0) {
            console.log('[API Keys] User not found - unauthorized');
            return { authorized: false };
        }
        const userId = userRes.rows[0].id;

        if (projectId) {
            // Check if user owns the org that owns the project, or has direct project access
            const accessCheck = await query(`
                SELECT 1 FROM projects p
                JOIN organizations o ON p.org_id = o.id
                LEFT JOIN project_users pu ON pu.project_id = p.id AND pu.user_id = $1
                WHERE p.id = $2 AND (o.owner_id = $1 OR pu.user_id IS NOT NULL)
            `, [userId, projectId]);
            console.log('[API Keys] Access check for userId:', userId, 'projectId:', projectId, 'result:', accessCheck.rows.length);
            if (accessCheck.rows.length === 0) {
                console.log('[API Keys] No project access - unauthorized');
                return { authorized: false };
            }
        }

        console.log('[API Keys] Authorized userId:', userId);
        return { authorized: true, userId };
    } catch (e) {
        console.error('[API Keys] verifyAccess error:', e);
        return { authorized: false };
    }
}

// Ensure the api_keys table exists
async function ensureApiKeysTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            key_type TEXT NOT NULL, -- 'anon' or 'service_role'
            key_hash TEXT NOT NULL,
            key_prefix TEXT NOT NULL, -- First 8 chars for display
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_used_at TIMESTAMPTZ,
            UNIQUE(project_id, key_type)
        )
    `);
}

// GET: Retrieve API keys for a project (shows only prefix, not full key)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const { authorized } = await verifyAccess(req, projectId);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureApiKeysTable();

        const result = await query(`
            SELECT id, key_type, key_prefix, created_at, last_used_at
            FROM api_keys
            WHERE project_id = $1
            ORDER BY key_type
        `, [projectId]);

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('API keys fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Generate new API keys for a project
export async function POST(req: NextRequest) {
    try {
        const { projectId, keyType } = await req.json();

        if (!projectId || !keyType) {
            return NextResponse.json({ error: 'Project ID and key type are required' }, { status: 400 });
        }

        if (!['anon', 'service_role'].includes(keyType)) {
            return NextResponse.json({ error: 'Key type must be "anon" or "service_role"' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureApiKeysTable();

        // Generate a new API key
        const prefix = keyType === 'anon' ? 'eh_anon' : 'eh_secret';
        const fullKey = generateApiKey(prefix);
        const keyHash = sha256(fullKey);
        const keyPrefix = fullKey.substring(0, 16) + '...';

        // Upsert the key (replace if exists)
        await query(`
            INSERT INTO api_keys (project_id, key_type, key_hash, key_prefix)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (project_id, key_type) DO UPDATE
            SET key_hash = EXCLUDED.key_hash, key_prefix = EXCLUDED.key_prefix, created_at = NOW()
        `, [projectId, keyType, keyHash, keyPrefix]);

        // Return the full key ONCE (user must save it)
        return NextResponse.json({
            success: true,
            key: fullKey,
            keyType,
            warning: 'Save this key now! You will not be able to see it again.'
        });
    } catch (error: any) {
        console.error('API key generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Revoke an API key
export async function DELETE(req: NextRequest) {
    try {
        const { projectId, keyType } = await req.json();

        if (!projectId || !keyType) {
            return NextResponse.json({ error: 'Project ID and key type are required' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await query(`DELETE FROM api_keys WHERE project_id = $1 AND key_type = $2`, [projectId, keyType]);

        return NextResponse.json({ success: true, message: `${keyType} key revoked` });
    } catch (error: any) {
        console.error('API key revocation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
