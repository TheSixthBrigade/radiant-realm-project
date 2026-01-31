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
    'cli_test_sync'
];

export async function GET(req: NextRequest) {
    const { authorized, projectId: authProjectId } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schema = searchParams.get('schema') || 'public';
    const projectId = searchParams.get('projectId') || authProjectId;

    try {
        // Build the exclusion list with proper $N placeholders
        const placeholders = INTERNAL_TABLES.map((_, i) => '$' + (i + 2)).join(', ');
        
        // Query PostgreSQL for BASE TABLEs only (not VIEWs)
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

        // Get row count estimates, filtered by project if specified
        const tablesWithCounts = await Promise.all(
            result.rows.map(async (table: any) => {
                try {
                    if (projectId) {
                        // Check if project_id column exists
                        const colCheck = await query(
                            'SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3',
                            [schema, table.table_name, 'project_id']
                        );

                        if (colCheck.rows.length > 0) {
                            // Table has project_id - filter by it
                            const res = await query(
                                'SELECT COUNT(*) as count FROM "' + schema + '"."' + table.table_name + '" WHERE project_id = $1',
                                [projectId]
                            );
                            return { ...table, row_count_estimate: parseInt(res.rows[0].count), has_project_id: true };
                        } else {
                            // No project_id column - don't show in project view
                            return null;
                        }
                    } else {
                        // No project filter - show all with total counts
                        const countResult = await query('SELECT COUNT(*) as count FROM "' + schema + '"."' + table.table_name + '"');
                        return { ...table, row_count_estimate: parseInt(countResult.rows[0].count) };
                    }
                } catch {
                    return null;
                }
            })
        );

        // Filter out nulls
        const filteredTables = tablesWithCounts.filter(t => t !== null);

        return NextResponse.json(filteredTables);
    } catch (error: any) {
        console.error('Database introspection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
