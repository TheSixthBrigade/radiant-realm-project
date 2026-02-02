import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// GET: List all indexes (filtered by project)
export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam || auth.projectId;

    try {
        // If projectId provided, only show indexes for tables owned by this project
        let tableFilter = '';
        if (projectId) {
            const ownedTables = await query(`
                SELECT table_name FROM _table_registry WHERE project_id = $1
            `, [projectId]);
            
            if (ownedTables.rows.length === 0) {
                return NextResponse.json([]);
            }
            
            const tableNames = ownedTables.rows.map((r: any) => `'${r.table_name}'`).join(',');
            tableFilter = ` AND t.relname IN (${tableNames})`;
        }

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
            WHERE n.nspname = $1${tableFilter}
        `;
        const params: any[] = [schema];

        if (tableName) {
            // Verify table belongs to project
            if (projectId) {
                const ownerCheck = await query(`
                    SELECT project_id FROM _table_registry WHERE table_name = $1
                `, [tableName]);
                if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].project_id != projectId) {
                    return NextResponse.json({ error: 'Table belongs to another project' }, { status: 403 });
                }
            }
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

// POST: Create a new index (with project verification)
export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { schema = 'public', table, indexName, columns, unique = false, method = 'btree', projectId } = await req.json();
        const actualProjectId = projectId || auth.projectId;

        if (!table || !indexName || !columns || columns.length === 0) {
            return NextResponse.json({ error: 'Table, indexName, and columns are required' }, { status: 400 });
        }

        // Verify table belongs to project
        if (actualProjectId) {
            const ownerCheck = await query(`
                SELECT project_id FROM _table_registry WHERE table_name = $1
            `, [table]);
            if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].project_id != actualProjectId) {
                return NextResponse.json({ error: 'Table belongs to another project' }, { status: 403 });
            }
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

// DELETE: Drop an index (with project verification)
export async function DELETE(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { schema = 'public', indexName, table, projectId } = await req.json();
        const actualProjectId = projectId || auth.projectId;

        if (!indexName) {
            return NextResponse.json({ error: 'indexName is required' }, { status: 400 });
        }

        // If table provided, verify ownership
        if (table && actualProjectId) {
            const ownerCheck = await query(`
                SELECT project_id FROM _table_registry WHERE table_name = $1
            `, [table]);
            if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].project_id != actualProjectId) {
                return NextResponse.json({ error: 'Table belongs to another project' }, { status: 403 });
            }
        }

        await query(`DROP INDEX IF EXISTS "${schema}"."${indexName}"`);

        return NextResponse.json({ success: true, message: `Index "${indexName}" dropped` });
    } catch (error: any) {
        console.error('Index deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
