import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

async function verifyAdmin(req: NextRequest) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) {
        console.log("VerifyAdmin: No token found");
        return false;
    }
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);

        console.log("VerifyAdmin: Payload Email =", payload.email);

        // Hardcoded Owner Bypass
        if (payload.email === 'thecheesemanatyou@gmail.com') {
            console.log("VerifyAdmin: Owner bypass triggered");
            return true;
        }

        const result = await query('SELECT access_level FROM permissions WHERE email = $1', [payload.email]);
        const isAllowed = result.rows[0]?.access_level === 'Owner' || result.rows[0]?.access_level === 'Admin';

        console.log("VerifyAdmin: DB check result =", isAllowed);
        return isAllowed;
    } catch (err: any) {
        console.error("VerifyAdmin: JWT Verification Error:", err.message);
        return false;
    }
}

export async function GET(req: NextRequest) {
    if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const result = await query('SELECT * FROM permissions ORDER BY created_at DESC');
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { email, access_level } = await req.json();
        await query('INSERT INTO permissions (email, access_level) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET access_level = EXCLUDED.access_level', [email, access_level]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { id } = await req.json();
        // Prevent self-deletion of owner
        const target = await query('SELECT email FROM permissions WHERE id = $1', [id]);
        if (target.rows[0]?.email === 'thecheesemanatyou@gmail.com') {
            return NextResponse.json({ error: 'Cannot delete the system owner' }, { status: 403 });
        }
        await query('DELETE FROM permissions WHERE id = $1', [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
