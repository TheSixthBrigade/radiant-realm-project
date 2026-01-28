import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { sha256 } from '@/lib/crypto';

export async function verifyAccess(req: NextRequest, projectId?: string) {
    try {
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

        // Optimization: Use a simpler user query
        const userRes = await query('SELECT id FROM users WHERE identity_id = $1 LIMIT 1', [payload.id]);
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
