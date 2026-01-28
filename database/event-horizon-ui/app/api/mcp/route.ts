import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

/**
 * MCP (Model Context Protocol) Implementation for Vectabase
 * This allows AI agents to discover and use database tools.
 */

const TOOLS = [
    {
        name: 'list_tables',
        description: 'Lists all tables in the current project database.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'query_database',
        description: 'Executes a SQL query against the database.',
        inputSchema: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: 'The SQL query to execute' }
            },
            required: ['sql']
        }
    },
    {
        name: 'get_schema',
        description: 'Gets the column schema for a specific table.',
        inputSchema: {
            type: 'object',
            properties: {
                table: { type: 'string', description: 'The name of the table' }
            },
            required: ['table']
        }
    }
];

export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
        mcp_version: '1.0.0',
        server_name: 'vectabase-core',
        tools: TOOLS
    });
}

export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { method, params } = await req.json();

        // Map common MCP patterns to our internal logic
        const toolName = method === 'tools/call' ? params?.name : null;
        const args = params?.arguments || {};

        if (method === 'tools/list') {
            return NextResponse.json({
                tools: TOOLS
            });
        }

        if (!toolName) return NextResponse.json({ error: 'Invalid MCP request' }, { status: 400 });

        const schema = auth.projectId ? `p${auth.projectId}` : 'public';

        switch (toolName) {
            case 'list_tables': {
                await query(`SET search_path TO ${schema}, public`);
                const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1", [schema]);
                return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify(result.rows) }] });
            }

            case 'query_database': {
                if (!args.sql) return NextResponse.json({ error: 'SQL is required' }, { status: 400 });

                // Multi-tenant isolation
                await query(`SET search_path TO ${schema}, public`);

                // Basic safety check for non-admins (restrict to SELECT)
                if (!auth.isAdmin && !args.sql.trim().toUpperCase().startsWith('SELECT')) {
                    return NextResponse.json({ error: 'Mutation queries are restricted to service_role keys' }, { status: 403 });
                }

                const result = await query(args.sql);
                return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify(result.rows) }] });
            }

            case 'get_schema': {
                if (!args.table) return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
                await query(`SET search_path TO ${schema}, public`);
                const result = await query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = $2
                `, [args.table, schema]);
                return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify(result.rows) }] });
            }

            default:
                return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 404 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
