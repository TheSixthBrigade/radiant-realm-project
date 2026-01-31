import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

const VALID_TYPES = [
    'text', 'varchar', 'int4', 'int8', 'integer', 'bigint', 'serial', 'bigserial',
    'uuid', 'bool', 'boolean', 'timestamptz', 'timestamp', 'date', 'time',
    'jsonb', 'json', 'float4', 'float8', 'real', 'double precision', 'numeric', 'decimal',
    'bytea', 'inet', 'cidr', 'macaddr', 'money', 'interval', 'point', 'line', 'polygon', 'circle'
];

// POST: Create a new table with user-defined columns
export async function POST(req: NextRequest) {
    const { authorized, projectId: authProjectId } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { tableName, columns, projectId } = await req.json();
        const actualProjectId = projectId || authProjectId;

        if (!tableName || !Array.isArray(columns)) {
            return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
        }

        // Validate table name (alphanumeric + underscores only)
        if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
            return NextResponse.json({ error: 'Invalid table name. Use lowercase letters, numbers, and underscores only.' }, { status: 400 });
        }

        // Required base columns (always added) - NO foreign key constraint
        const baseColumns = [
            { name: 'id', type: 'serial', primaryKey: true },
            { name: 'project_id', type: 'integer', nullable: false },
            { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamptz', default: 'NOW()' }
        ];

        // Merge custom columns (filter out any that match base columns)
        const baseNames = baseColumns.map(c => c.name);
        const customColumns = columns.filter((c: any) => !baseNames.includes(c.name));
        const allColumns = [...baseColumns, ...customColumns];

        // Build column definitions
        const columnDefs = allColumns.map((col: any) => {
            const type = VALID_TYPES.includes(col.type?.toLowerCase()) ? col.type : 'text';
            let def = `"${col.name}" ${type.toUpperCase()}`;

            if (col.primaryKey) def += ' PRIMARY KEY';
            if (col.nullable === false && !col.primaryKey) def += ' NOT NULL';
            if (col.default) def += ` DEFAULT ${col.default}`;
            if (col.unique) def += ' UNIQUE';

            return def;
        }).join(',\n    ');

        // Build and execute CREATE TABLE - NO foreign key constraint
        const sql = `CREATE TABLE IF NOT EXISTS "public"."${tableName}" (${columnDefs});`;

        console.log('Creating table with SQL:', sql);
        await query(sql);

        // Create index on project_id for faster queries
        try {
            await query(`CREATE INDEX IF NOT EXISTS "${tableName}_project_id_idx" ON "public"."${tableName}" (project_id);`);
        } catch (e) {
            console.log('Index creation note:', e);
        }

        // Register table ownership for project isolation
        if (actualProjectId) {
            try {
                await query(`
                    INSERT INTO _table_registry (table_name, project_id, created_by)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (table_name) DO UPDATE SET project_id = $2
                `, [tableName, actualProjectId, null]);
            } catch (e) {
                console.log('Table registry note:', e);
            }
        }

        return NextResponse.json({
            success: true,
            tableName,
            projectId: actualProjectId,
            message: `Table "${tableName}" created successfully with ${allColumns.length} columns.`
        });
    } catch (error: any) {
        console.error('Table creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
