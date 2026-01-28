import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

async function verifyAccess(req: NextRequest) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return { authorized: false };
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        if (payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com') {
            return { authorized: true };
        }
        return { authorized: true };
    } catch {
        return { authorized: false };
    }
}

// GET: List all indexes
export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';

    try {
        let sql = `
            SELECT 
                i.relname as index_name,
                t.relname as table_name,
                n.nspname as schema_name,
                am.amname as index_type,
                ix.indisunique as is_unique,
                ix.indisprimary as is_primary,
                pg_get_indexdef(i.oid) as index_definition,
                pg_size_pretty(pg_relation_size(i.oid)) as index_size
            FROM pg_index ix
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_am am ON am.oid = i.relam
            WHERE n.nspname = $1
        `;
        const params: any[] = [schema];

        if (tableName) {
            sql += ` AND t.relname = $2`;
            params.push(tableName);
        }

        sql += ` ORDER BY t.relname, i.relname`;

        const result = await query(sql, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Indexes fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new index
export async function POST(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { schema = 'public', table, indexName, columns, unique = false, method = 'btree' } = await req.json();

        if (!table || !indexName || !columns || columns.length === 0) {
            return NextResponse.json({ error: 'Table, indexName, and columns are required' }, { status: 400 });
        }

        const uniqueClause = unique ? 'UNIQUE ' : '';
        const columnList = columns.map((c: string) => `"${c}"`).join(', ');

        const sql = `CREATE ${uniqueClause}INDEX "${indexName}" ON "${schema}"."${table}" USING ${method} (${columnList})`;
        await query(sql);

        return NextResponse.json({ success: true, message: `Index "${indexName}" created on ${schema}.${table}` });
    } catch (error: any) {
        console.error('Index creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Drop an index
export async function DELETE(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { schema = 'public', indexName } = await req.json();

        if (!indexName) {
            return NextResponse.json({ error: 'indexName is required' }, { status: 400 });
        }

        await query(`DROP INDEX IF EXISTS "${schema}"."${indexName}"`);

        return NextResponse.json({ success: true, message: `Index "${indexName}" dropped` });
    } catch (error: any) {
        console.error('Index deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
