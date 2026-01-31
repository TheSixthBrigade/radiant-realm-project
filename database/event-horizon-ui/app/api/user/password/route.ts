import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sha256 } from '@/lib/crypto';

export async function PUT(req: NextRequest) {
    try {
        // Get user from session
        const cookieStore = await cookies();
        const token = cookieStore.get('pqc_session')?.value;
        
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        
        const { currentPassword, newPassword } = await req.json();
        
        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
        }

        // Get user
        const userResult = await query(
            'SELECT id, password_hash FROM users WHERE email = $1',
            [payload.email]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        // If user has existing password, verify it
        if (user.password_hash) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
            }
            
            const [salt, storedHash] = user.password_hash.split(':');
            const inputHash = sha256(currentPassword + salt);
            
            if (inputHash !== storedHash) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
            }
        }

        // Create new password hash
        const newSalt = `vectabase-${user.id}-${Date.now()}`;
        const newHash = sha256(newPassword + newSalt);
        
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [`${newSalt}:${newHash}`, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
