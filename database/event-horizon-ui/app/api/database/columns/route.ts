import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam || auth.projectId;

    if (!tableName) {
        return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    try {
        // Verify table belongs to this project via _table_registry
        if (projectId) {
            const ownerCheck = await query(`
                SELECT project_id FROM _table_registry WHERE table_name = $1
            `, [tableName]);
            
            if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].project_id != projectId) {
                return NextResponse.json({ error: 'Table belongs to another project' }, { status: 403 });
            }
        }
        const result = await query(`
            SELECT 
                c.column_name,
                c.data_type,
                c.udt_name,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
                c.numeric_precision,
                c.ordinal_position,
                CASE 
                    WHEN pk.column_name IS NOT NULL THEN true 
                    ELSE false 
                END as is_primary_key,
                CASE 
                    WHEN fk.column_name IS NOT NULL THEN true 
                    ELSE false 
                END as is_foreign_key,
                fk.foreign_table_name,
                fk.foreign_column_name
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                    ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = $1
                    AND tc.table_name = $2
            ) pk ON c.column_name = pk.column_name
            LEFT JOIN (
                SELECT 
                    kcu.column_name,
                    ccu.table_name as foreign_table_name,
                    ccu.column_name as foreign_column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = $1
                    AND tc.table_name = $2
            ) fk ON c.column_name = fk.column_name
            WHERE c.table_schema = $1 AND c.table_name = $2
            ORDER BY c.ordinal_position
        `, [schema, tableName]);

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Column introspection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
