import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// GET: List all RLS policies
export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('table');
    // Default to project schema if relevant
    const schema = auth.projectId ? `p${auth.projectId}` : (searchParams.get('schema') || 'public');

    try {
        let sql = `
            SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual,
                with_check
            FROM pg_policies
            WHERE schemaname = $1
        `;
        const params: any[] = [schema];

        if (tableName) {
            sql += ` AND tablename = $2`;
            params.push(tableName);
        }

        sql += ` ORDER BY tablename, policyname`;

        const result = await query(sql, params);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('RLS policies fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new RLS policy
export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { table, policyName, command, using, withCheck, roles } = await req.json();
        const schema = auth.projectId ? `p${auth.projectId}` : 'public';

        if (!table || !policyName || !command) {
            return NextResponse.json({ error: 'Table, policyName, and command are required' }, { status: 400 });
        }

        const validCommands = ['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'];
        if (!validCommands.includes(command.toUpperCase())) {
            return NextResponse.json({ error: 'Invalid command. Must be ALL, SELECT, INSERT, UPDATE, or DELETE' }, { status: 400 });
        }

        // Build the CREATE POLICY statement
        let sql = `CREATE POLICY "${policyName}" ON "${schema}"."${table}" FOR ${command}`;

        if (roles && roles.length > 0) {
            sql += ` TO ${roles.join(', ')}`;
        }

        if (using) {
            sql += ` USING (${using})`;
        }

        if (withCheck) {
            sql += ` WITH CHECK (${withCheck})`;
        }

        await query(sql);

        return NextResponse.json({ success: true, message: `Policy "${policyName}" created on ${schema}.${table}` });
    } catch (error: any) {
        console.error('RLS policy creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Drop an RLS policy
export async function DELETE(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { table, policyName } = await req.json();
        const schema = auth.projectId ? `p${auth.projectId}` : 'public';

        if (!table || !policyName) {
            return NextResponse.json({ error: 'Table and policyName are required' }, { status: 400 });
        }

        await query(`DROP POLICY IF EXISTS "${policyName}" ON "${schema}"."${table}"`);

        return NextResponse.json({ success: true, message: `Policy "${policyName}" dropped` });
    } catch (error: any) {
        console.error('RLS policy deletion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
