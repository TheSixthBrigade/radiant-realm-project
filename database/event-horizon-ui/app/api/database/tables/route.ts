import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeSqlIdentifier, checkProjectAccess } from '@/lib/security';

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
    const { authorized, projectId: authProjectId, userId, method } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schemaRaw = searchParams.get('schema') || 'public';
    const projectIdParam = searchParams.get('projectId');

    // Sanitize the schema parameter
    const schema = sanitizeSqlIdentifier(schemaRaw);

    // Determine projectId: use authProjectId (API key) or query param (session)
    let projectId: number | null = authProjectId || null;

    // For session auth without authProjectId, require projectId query param
    if (method === 'session' && !authProjectId) {
        if (!projectIdParam) {
            return NextResponse.json(
                { error: 'Project ID is required for session-based access' },
                { status: 400 }
            );
        }

        const pid = parseInt(projectIdParam, 10);
        if (isNaN(pid)) {
            return NextResponse.json(
                { error: 'Project ID is required for session-based access' },
                { status: 400 }
            );
        }

        // Verify user has access to this project
        const hasAccess = await checkProjectAccess(pid, userId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Access denied to this project' },
                { status: 403 }
            );
        }

        projectId = pid;
    } else if (projectIdParam && !authProjectId) {
        // Fallback: use projectIdParam if available
        projectId = parseInt(projectIdParam, 10) || null;
    }

    // Rate limiting check (currently unlimited but tracks usage)
    const rateCheck = await checkRateLimit(projectId || 0);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        // If projectId is specified, only show tables owned by this project
        if (projectId) {
            // First, check if _table_registry exists
            const registryExists = await query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = '_table_registry'
            `);

            if (registryExists.rows.length === 0) {
                // Registry doesn't exist - fall back to showing only tables that have
                // a project_id column with matching rows (not all tables)
                console.log('_table_registry not found, falling back to legacy mode with project_id filtering');
                const placeholders = INTERNAL_TABLES.map((_, i) => `$${i + 2}`).join(', ');
                const sql = `
                    SELECT t.table_name, t.table_type
                    FROM information_schema.tables t
                    WHERE t.table_schema = $1
                    AND t.table_type = 'BASE TABLE'
                    AND t.table_name NOT IN (${placeholders})
                    ORDER BY t.table_name
                `;
                const allTables = await query(sql, [schema, ...INTERNAL_TABLES]);

                // Filter to only tables that have a project_id column
                const tablesWithProjectId: any[] = [];
                for (const table of allTables.rows) {
                    const safeTableName = sanitizeSqlIdentifier(table.table_name);
                    const hasProjectIdCol = await query(`
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = $1 AND table_name = $2 AND column_name = 'project_id'
                    `, [schema, safeTableName]);

                    if (hasProjectIdCol.rows.length > 0) {
                        // Check if this table has rows matching the current projectId
                        try {
                            const rowCheck = await query(
                                `SELECT COUNT(*) as count FROM "${schema}"."${safeTableName}" WHERE project_id = $1`,
                                [projectId]
                            );
                            const count = parseInt(rowCheck.rows[0]?.count || '0');
                            if (count > 0) {
                                tablesWithProjectId.push({
                                    ...table,
                                    row_count_estimate: count
                                });
                            }
                        } catch {
                            // Skip tables that error on query
                        }
                    }
                }

                return NextResponse.json(tablesWithProjectId);
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
                    const safeTableName = sanitizeSqlIdentifier(tableName);
                    try {
                        // Verify table still exists
                        const exists = await query(`
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = $1 AND table_name = $2
                        `, [schema, safeTableName]);

                        if (exists.rows.length === 0) {
                            // Table was deleted externally, clean up registry
                            await query(`DELETE FROM _table_registry WHERE table_name = $1`, [safeTableName]);
                            return null;
                        }

                        // Get column count
                        const colCount = await query(`
                            SELECT COUNT(*) as count FROM information_schema.columns 
                            WHERE table_schema = $1 AND table_name = $2
                        `, [schema, safeTableName]);

                        // Get row count for this project
                        const rowCount = await query(
                            `SELECT COUNT(*) as count FROM "${schema}"."${safeTableName}" WHERE project_id = $1`,
                            [projectId]
                        );

                        return {
                            table_name: safeTableName,
                            table_type: 'BASE TABLE',
                            column_count: parseInt(colCount.rows[0]?.count || '0'),
                            row_count_estimate: parseInt(rowCount.rows[0]?.count || '0')
                        };
                    } catch (e) {
                        console.error(`Error getting table ${safeTableName}:`, e);
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
                const safeTableName = sanitizeSqlIdentifier(table.table_name);
                try {
                    const countResult = await query(`SELECT COUNT(*) as count FROM "${schema}"."${safeTableName}"`);
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
