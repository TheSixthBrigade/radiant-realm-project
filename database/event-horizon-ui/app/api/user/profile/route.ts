import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
        
        const { name } = await req.json();
        
        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Update user profile
        await query(
            'UPDATE users SET name = $1, updated_at = NOW() WHERE email = $2',
            [name.trim(), payload.email]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('pqc_session')?.value;
        
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        
        const result = await query(
            'SELECT id, email, name, role, created_at FROM users WHERE email = $1',
            [payload.email]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}
