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
        // Query to get all triggers from pg_trigger
        const query = `
            SELECT 
                t.tgname AS trigger_name,
                c.relname AS table_name,
                n.nspname AS schema_name,
                p.proname AS function_name,
                CASE t.tgtype & 1
                    WHEN 1 THEN 'ROW'
                    ELSE 'STATEMENT'
                END AS trigger_level,
                CASE 
                    WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
                    WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
                    ELSE 'AFTER'
                END AS trigger_timing,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN t.tgtype & 4 = 4 THEN 'INSERT' END,
                    CASE WHEN t.tgtype & 8 = 8 THEN 'DELETE' END,
                    CASE WHEN t.tgtype & 16 = 16 THEN 'UPDATE' END,
                    CASE WHEN t.tgtype & 32 = 32 THEN 'TRUNCATE' END
                ], NULL) AS events,
                t.tgenabled AS enabled,
                obj_description(t.oid, 'pg_trigger') AS description
            FROM pg_catalog.pg_trigger t
            JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
            WHERE n.nspname = $1
            AND NOT t.tgisinternal
            ORDER BY c.relname, t.tgname;
        `;

        const result = await pool.query(query, [schema]);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching triggers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            name, 
            schema = 'public', 
            table, 
            timing = 'AFTER', 
            events = ['INSERT'], 
            level = 'ROW',
            functionName,
            functionSchema = 'public'
        } = body;

        if (!name || !table || !functionName) {
            return NextResponse.json({ 
                error: 'Trigger name, table, and function name are required' 
            }, { status: 400 });
        }

        const eventsStr = events.join(' OR ');
        const createQuery = `
            CREATE TRIGGER ${name}
            ${timing} ${eventsStr}
            ON ${schema}.${table}
            FOR EACH ${level}
            EXECUTE FUNCTION ${functionSchema}.${functionName}();
        `;

        await pool.query(createQuery);
        return NextResponse.json({ success: true, message: `Trigger ${name} created successfully` });
    } catch (error: any) {
        console.error('Error creating trigger:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const table = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';

    if (!name || !table) {
        return NextResponse.json({ error: 'Trigger name and table are required' }, { status: 400 });
    }

    try {
        const dropQuery = `DROP TRIGGER IF EXISTS ${name} ON ${schema}.${table} CASCADE;`;
        await pool.query(dropQuery);
        return NextResponse.json({ success: true, message: `Trigger ${name} dropped successfully` });
    } catch (error: any) {
        console.error('Error dropping trigger:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
