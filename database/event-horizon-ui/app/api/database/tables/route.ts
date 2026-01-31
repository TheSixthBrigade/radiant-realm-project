import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// System/internal tables that should NEVER be shown in the Table Editor
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
    'storage_objects',
    'sessions',
    'sso_configurations',
    'sso_invites',
    'vault_secrets',
    'encryption_keys',
    'security_audit_log',
    'failed_logins',
    'rate_limits',
    'active_sessions',
    'edge_functions',
    'edge_function_files',
    'webhooks',
    'realtime_subscriptions',
    'realtime_broadcasts',
    'migrations',
    'applied_migrations',
    'roblox_users',
    'announcements',
    'cli_test_sync',
    '_table_registry'
];

export async function GET(req: NextRequest) {
    const { authorized, projectId: authProjectId } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schema = searchParams.get('schema') || 'public';
    const projectId = searchParams.get('projectId') || authProjectId;

    try {
        // If projectId is specified, only show tables owned by this project
        if (projectId) {
            // First, check if _table_registry exists
            const registryExists = await query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = '_table_registry'
            `);

            if (registryExists.rows.length === 0) {
                // Registry doesn't exist - fall back to showing all tables with project_id column
                console.log('_table_registry not found, falling back to legacy mode');
                const placeholders = INTERNAL_TABLES.map((_, i) => `$${i + 2}`).join(', ');
                const sql = `
                    SELECT t.table_name, t.table_type
                    FROM information_schema.tables t
                    WHERE t.table_schema = $1
                    AND t.table_type = 'BASE TABLE'
                    AND t.table_name NOT IN (${placeholders})
                    ORDER BY t.table_name
                `;
                const result = await query(sql, [schema, ...INTERNAL_TABLES]);
                
                const tablesWithCounts = await Promise.all(
                    result.rows.map(async (table: any) => {
                        try {
                            const countResult = await query(`SELECT COUNT(*) as count FROM "${schema}"."${table.table_name}"`);
                            return { ...table, row_count_estimate: parseInt(countResult.rows[0]?.count || '0') };
                        } catch {
                            return { ...table, row_count_estimate: 0 };
                        }
                    })
                );
                return NextResponse.json(tablesWithCounts);
            }

            // Registry exists - get tables from registry for this project
            const registryResult = await query(`
                SELECT table_name FROM _table_registry WHERE project_id = $1
            `, [projectId]);

            const ownedTables = registryResult.rows.map((r: any) => r.table_name);

            if (ownedTables.length === 0) {
                return NextResponse.json([]);
            }

            // Get details for owned tables only
            const tablesWithCounts = await Promise.all(
                ownedTables.map(async (tableName: string) => {
                    try {
                        // Verify table still exists
                        const exists = await query(`
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = $1 AND table_name = $2
                        `, [schema, tableName]);

                        if (exists.rows.length === 0) {
                            // Table was deleted externally, clean up registry
                            await query(`DELETE FROM _table_registry WHERE table_name = $1`, [tableName]);
                            return null;
                        }

                        // Get column count
                        const colCount = await query(`
                            SELECT COUNT(*) as count FROM information_schema.columns 
                            WHERE table_schema = $1 AND table_name = $2
                        `, [schema, tableName]);

                        // Get row count for this project
                        const rowCount = await query(
                            `SELECT COUNT(*) as count FROM "${schema}"."${tableName}" WHERE project_id = $1`,
                            [projectId]
                        );

                        return {
                            table_name: tableName,
                            table_type: 'BASE TABLE',
                            column_count: parseInt(colCount.rows[0]?.count || '0'),
                            row_count_estimate: parseInt(rowCount.rows[0]?.count || '0')
                        };
                    } catch (e) {
                        console.error(`Error getting table ${tableName}:`, e);
                        return null;
                    }
                })
            );

            return NextResponse.json(tablesWithCounts.filter(t => t !== null));
        }

        // No project filter - show all non-internal tables (admin view)
        const placeholders = INTERNAL_TABLES.map((_, i) => `$${i + 2}`).join(', ');
        
        const sql = `
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
            AND t.table_type = 'BASE TABLE'
            AND t.table_name NOT IN (${placeholders})
            ORDER BY t.table_name
        `;
        
        const result = await query(sql, [schema, ...INTERNAL_TABLES]);

        // Get row counts
        const tablesWithCounts = await Promise.all(
            result.rows.map(async (table: any) => {
                try {
                    const countResult = await query(`SELECT COUNT(*) as count FROM "${schema}"."${table.table_name}"`);
                    return { ...table, row_count_estimate: parseInt(countResult.rows[0]?.count || '0') };
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
