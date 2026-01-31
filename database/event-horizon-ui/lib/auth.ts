import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { sha256 } from '@/lib/crypto';

// Lattice master key for emergency admin access
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY || 'vectabase-lattice-2026-master-key';

export async function verifyAccess(req: NextRequest, projectId?: string) {
    try {
        // Check for Lattice admin cookie first (bypass all other checks)
        const latticeToken = req.cookies.get('lattice_admin')?.value;
        if (latticeToken === LATTICE_MASTER_KEY) {
            // Return lattice admin session
            const userRes = await query(`
                SELECT id FROM users WHERE email = 'lattice-admin@vectabase.internal' LIMIT 1
            `).catch(() => ({ rows: [] }));
            
            return {
                authorized: true,
                userId: userRes.rows[0]?.id || 0,
                isAdmin: true,
                isLatticeAdmin: true,
                method: 'session'
            };
        }

        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const apiKey = authHeader.substring(7);
            const keyHash = sha256(apiKey);

            const keyResult = await query(`
                SELECT project_id, key_type 
                FROM api_keys 
                WHERE key_hash = $1
            `, [keyHash]);

            if (keyResult.rows.length > 0) {
                const keyData = keyResult.rows[0];
                if (projectId && keyData.project_id !== parseInt(projectId)) return { authorized: false };

                // Fire and forget update (don't wait/hang for it)
                query('UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1', [keyHash]).catch(() => { });

                return {
                    authorized: true,
                    projectId: keyData.project_id,
                    isAdmin: keyData.key_type === 'service_role',
                    method: 'api_key'
                };
            }
        }

        const token = req.cookies.get('pqc_session')?.value;
        if (!token) return { authorized: false };

        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);

        // Check if this is a Lattice admin JWT
        if (payload.isLatticeAdmin) {
            const userRes = await query(`
                SELECT id FROM users WHERE email = $1 LIMIT 1
            `, [payload.email]).catch(() => ({ rows: [] }));
            
            return {
                authorized: true,
                userId: userRes.rows[0]?.id || 0,
                isAdmin: true,
                isLatticeAdmin: true,
                method: 'session'
            };
        }

        // FIXED: Look up user by EMAIL instead of identity_id
        // This fixes the issue where logging in with different providers (Google, SSO, etc.)
        // would create different identity_ids but the JWT contains the correct email
        const userRes = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
        if (userRes.rows.length === 0) return { authorized: false };

        return {
            authorized: true,
            userId: userRes.rows[0].id,
            isAdmin: payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com',
            method: 'session'
        };
    } catch (error: any) {
        return { authorized: false, error: error.message };
    }
}
