import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

const INTERNAL_TABLES = [
    'api_keys',
    'app_users',
    'organizations',
    'permissions',
    'project_users',
    'projects',
    'provider_configs',
    'users',
    '_vectabase_migrations',
    'storage_buckets',
    'storage_objects'
];

export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schema = searchParams.get('schema') || 'public';
    const projectId = searchParams.get('projectId');

    try {
        // Query PostgreSQL information_schema for real table data
        const result = await query(`
            SELECT 
                t.table_name,
                t.table_type,
                (
                    SELECT COUNT(*) 
                    FROM information_schema.columns c 
                    WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
                ) as column_count
            FROM information_schema.tables t
            WHERE t.table_schema = $1
            AND t.table_type IN ('BASE TABLE', 'VIEW')
            AND t.table_name NOT IN (${INTERNAL_TABLES.map((_, i) => `$${i + 2}`).join(', ')})
            ORDER BY t.table_name
        `, [schema, ...INTERNAL_TABLES]);

        // Get row count estimates for each table
        const tablesWithCounts = await Promise.all(
            result.rows.map(async (table: any) => {
                try {
                    let count = 0;
                    if (projectId) {
                        // Check if project_id column exists
                        const colCheck = await query(`
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = $1 AND table_name = $2 AND column_name = 'project_id'
                        `, [schema, table.table_name]);

                        if (colCheck.rows.length > 0) {
                            const res = await query(`SELECT COUNT(*) as count FROM "${schema}"."${table.table_name}" WHERE project_id = $1`, [projectId]);
                            count = parseInt(res.rows[0].count);
                        } else {
                            // Non-scoped table, return 0 for project-only view
                            count = 0;
                        }
                    } else {
                        const countResult = await query(`SELECT COUNT(*) as count FROM "${schema}"."${table.table_name}"`);
                        count = parseInt(countResult.rows[0].count);
                    }
                    return {
                        ...table,
                        row_count_estimate: count
                    };
                } catch {
                    return { ...table, row_count_estimate: 0 };
                }
            })
        );

        return NextResponse.json(tablesWithCounts);
    } catch (error: any) {
        console.error('Database introspection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
