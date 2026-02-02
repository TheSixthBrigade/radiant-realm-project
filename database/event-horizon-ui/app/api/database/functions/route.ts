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
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get('schema') || 'public';
    const projectId = searchParams.get('projectId');

    try {
        // Query to get all user-defined functions from pg_proc
        const query = `
            SELECT 
                p.proname AS function_name,
                n.nspname AS schema_name,
                pg_catalog.pg_get_function_result(p.oid) AS return_type,
                pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
                CASE p.prokind
                    WHEN 'f' THEN 'function'
                    WHEN 'p' THEN 'procedure'
                    WHEN 'a' THEN 'aggregate'
                    WHEN 'w' THEN 'window'
                END AS kind,
                l.lanname AS language,
                p.prosrc AS source_code,
                obj_description(p.oid, 'pg_proc') AS description,
                p.provolatile AS volatility,
                p.prosecdef AS security_definer
            FROM pg_catalog.pg_proc p
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
            LEFT JOIN pg_catalog.pg_language l ON l.oid = p.prolang
            WHERE n.nspname = $1
            AND p.prokind IN ('f', 'p')
            AND l.lanname IN ('plpgsql', 'sql')
            ORDER BY p.proname;
        `;

        const result = await pool.query(query, [schema]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching functions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, schema = 'public', returns = 'void', language = 'plpgsql', body: funcBody, args = '' } = body;

        if (!name || !funcBody) {
            return NextResponse.json({ error: 'Function name and body are required' }, { status: 400 });
        }

        const createQuery = `
            CREATE OR REPLACE FUNCTION ${schema}.${name}(${args})
            RETURNS ${returns}
            LANGUAGE ${language}
            AS $$
            ${funcBody}
            $$;
        `;

        await pool.query(createQuery);
        return NextResponse.json({ success: true, message: `Function ${name} created successfully` });
    } catch (error: any) {
        console.error('Error creating function:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const schema = searchParams.get('schema') || 'public';
    const args = searchParams.get('args') || '';

    if (!name) {
        return NextResponse.json({ error: 'Function name is required' }, { status: 400 });
    }

    try {
        const dropQuery = `DROP FUNCTION IF EXISTS ${schema}.${name}(${args}) CASCADE;`;
        await pool.query(dropQuery);
        return NextResponse.json({ success: true, message: `Function ${name} dropped successfully` });
    } catch (error: any) {
        console.error('Error dropping function:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
