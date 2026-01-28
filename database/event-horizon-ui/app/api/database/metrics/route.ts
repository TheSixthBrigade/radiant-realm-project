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

// GET: Get database metrics and infrastructure stats
export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    try {
        // Get database size (global)
        const dbSizeResult = await query(`SELECT pg_size_pretty(pg_database_size(current_database())) as database_size`);

        // Get table count
        const tableCountResult = await query(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        // Get total row count estimate (project-scoped if possible)
        let totalRows = 0;
        if (projectId) {
            // High-precision count: Find all tables that have a project_id column
            const tablesWithProjectCol = await query(`
                SELECT table_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND column_name = 'project_id'
            `);

            if (tablesWithProjectCol.rows.length > 0) {
                for (const table of tablesWithProjectCol.rows) {
                    try {
                        const countRes = await query(`SELECT COUNT(*) as count FROM "${table.table_name}" WHERE project_id = $1`, [projectId]);
                        totalRows += parseInt(countRes.rows[0].count);
                    } catch (e) {
                        // Skip if count fails (e.g. invalid table state)
                    }
                }
            } else {
                totalRows = 0;
            }
        } else {
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
            table_count: parseInt(tableCountResult.rows[0]?.table_count || '0'),
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
