import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// System tables that can NEVER be deleted
const PROTECTED_TABLES = [
    'api_keys', 'app_users', 'organizations', 'permissions', 'project_users',
    'projects', 'provider_configs', 'users', '_vectabase_migrations',
    'storage_buckets', 'storage_objects', 'sessions', 'sso_configurations',
    'sso_invites', 'vault_secrets', 'encryption_keys', 'security_audit_log',
    'failed_logins', 'rate_limits', 'active_sessions', 'edge_functions',
    'edge_function_files', 'webhooks', 'realtime_subscriptions',
    'realtime_broadcasts', 'migrations', 'applied_migrations', '_table_registry'
];

export async function POST(req: NextRequest) {
    const { authorized, userId } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { tableName, projectId } = await req.json();

        if (!tableName) {
            return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
        }

        // Check if table is protected
        if (PROTECTED_TABLES.includes(tableName.toLowerCase())) {
            return NextResponse.json({ error: 'Cannot delete system table' }, { status: 403 });
        }

        // Verify table exists
        const tableCheck = await query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);

        if (tableCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 });
        }

        // If projectId provided, verify ownership via registry
        if (projectId) {
            const ownerCheck = await query(`
                SELECT project_id FROM _table_registry WHERE table_name = $1
            `, [tableName]);

            if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].project_id !== projectId) {
                return NextResponse.json({ error: 'Table belongs to another project' }, { status: 403 });
            }
        }

        // Drop the table
        await query(`DROP TABLE IF EXISTS "public"."${tableName}" CASCADE`);

        // Remove from registry
        await query(`DELETE FROM _table_registry WHERE table_name = $1`, [tableName]);

        return NextResponse.json({ 
            success: true, 
            message: `Table "${tableName}" deleted successfully` 
        });
    } catch (error: any) {
        console.error('Delete table error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
