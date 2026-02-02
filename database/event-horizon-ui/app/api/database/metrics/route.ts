import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// GET: Get database metrics and infrastructure stats (project-scoped)
export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam || auth.projectId;

    try {
        // Get database size (global)
        const dbSizeResult = await query(`SELECT pg_size_pretty(pg_database_size(current_database())) as database_size`);

        // Get table count
        const tableCountResult = await query(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        // Get total row count estimate (project-scoped using _table_registry)
        let totalRows = 0;
        let projectTableCount = 0;
        
        if (projectId) {
            // ONLY count rows from tables registered to THIS project in _table_registry
            const registeredTables = await query(`
                SELECT table_name FROM _table_registry WHERE project_id = $1
            `, [projectId]);

            projectTableCount = registeredTables.rows.length;

            for (const table of registeredTables.rows) {
                try {
                    // Count rows that belong to this project
                    const countRes = await query(
                        `SELECT COUNT(*) as count FROM "${table.table_name}" WHERE project_id = $1`, 
                        [projectId]
                    );
                    totalRows += parseInt(countRes.rows[0].count);
                } catch (e) {
                    // Skip if count fails
                }
            }
        } else {
            // No project filter - show global stats (admin view)
            const rowCountResult = await query(`
                SELECT COALESCE(SUM(n_live_tup), 0) as total_rows
                FROM pg_stat_user_tables
            `);
            totalRows = parseInt(rowCountResult.rows[0].total_rows);
        }

        // Get connection stats
        const connectionResult = await query(`
            SELECT 
                numbackends as active_connections,
                xact_commit as transactions_committed,
                xact_rollback as transactions_rolled_back,
                blks_read as disk_blocks_read,
                blks_hit as cache_hits,
                tup_returned as rows_returned,
                tup_fetched as rows_fetched,
                tup_inserted as rows_inserted,
                tup_updated as rows_updated,
                tup_deleted as rows_deleted
            FROM pg_stat_database 
            WHERE datname = current_database()
        `);

        // Get index usage stats
        const indexUsageResult = await query(`
            SELECT 
                COUNT(*) as total_indexes,
                SUM(idx_scan)::bigint as total_index_scans,
                SUM(idx_tup_read)::bigint as total_tuples_read,
                SUM(idx_tup_fetch)::bigint as total_tuples_fetched
            FROM pg_stat_user_indexes
        `);

        // Get cache hit ratio
        const cacheResult = await query(`
            SELECT 
                ROUND(100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit) + SUM(blks_read), 0), 2) as cache_hit_ratio
            FROM pg_stat_database 
            WHERE datname = current_database()
        `);

        // Get replication status (if any)
        const replicationResult = await query(`
            SELECT COUNT(*) as replica_count FROM pg_stat_replication
        `);

        // Get uptime
        const uptimeResult = await query(`SELECT pg_postmaster_start_time() as start_time`);

        return NextResponse.json({
            database_size: dbSizeResult.rows[0]?.database_size || '0 MB',
            table_count: projectId ? projectTableCount : parseInt(tableCountResult.rows[0]?.table_count || '0'),
            total_rows: totalRows,
            connections: connectionResult.rows[0] || {},
            index_usage: indexUsageResult.rows[0] || {},
            cache_hit_ratio: parseFloat(cacheResult.rows[0]?.cache_hit_ratio || '0'),
            replica_count: parseInt(replicationResult.rows[0]?.replica_count || '0'),
            uptime_since: uptimeResult.rows[0]?.start_time,
            status: 'healthy'
        });
    } catch (error: any) {
        console.error('Metrics fetch error:', error);
        return NextResponse.json({ error: error.message, status: 'error' }, { status: 500 });
    }
}
