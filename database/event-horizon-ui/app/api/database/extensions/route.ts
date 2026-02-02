import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

export async function GET(request: NextRequest) {
    try {
        const query = `
            SELECT 
                e.extname,
                e.extversion,
                n.nspname AS schema_name,
                c.description AS comment
            FROM pg_catalog.pg_extension e
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
            LEFT JOIN pg_catalog.pg_description c ON c.objoid = e.oid AND c.classoid = 'pg_extension'::regclass
            ORDER BY e.extname;
        `;

        const result = await pool.query(query);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching extensions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, schema = 'public' } = body;

        if (!name) {
            return NextResponse.json({ error: 'Extension name is required' }, { status: 400 });
        }

        const createQuery = `CREATE EXTENSION IF NOT EXISTS "${name}" SCHEMA ${schema};`;
        await pool.query(createQuery);
        return NextResponse.json({ success: true, message: `Extension ${name} enabled successfully` });
    } catch (error: any) {
        console.error('Error enabling extension:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Extension name is required' }, { status: 400 });
    }

    try {
        const dropQuery = `DROP EXTENSION IF EXISTS "${name}" CASCADE;`;
        await pool.query(dropQuery);
        return NextResponse.json({ success: true, message: `Extension ${name} disabled successfully` });
    } catch (error: any) {
        console.error('Error disabling extension:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
