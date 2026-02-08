import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import { checkRateLimit, trackEgress, getRateLimitHeaders } from '@/lib/rateLimit';
import { checkProjectAccess } from '@/lib/security';

// System/internal tables that should NEVER be modified via DDL
const SYSTEM_TABLES = [
    'api_keys', 'app_users', 'organizations', 'permissions', 'project_users',
    'projects', 'provider_configs', 'users', '_vectabase_migrations',
    'storage_buckets', 'storage_objects', 'sessions', 'sso_configurations',
    'sso_invites', 'vault_secrets', 'encryption_keys', 'security_audit_log',
    'failed_logins', 'rate_limits', 'active_sessions', 'edge_functions',
    'edge_function_files', 'webhooks', 'realtime_subscriptions',
    'realtime_broadcasts', 'migrations', 'applied_migrations',
    '_table_registry'
];

// Dangerous SQL patterns that should be blocked
const DANGEROUS_PATTERNS = [
    /DROP\s+DATABASE/i,
    /TRUNCATE\s+.*CASCADE/i,
    /ALTER\s+SYSTEM/i,
    /pg_terminate_backend/i,
    /pg_cancel_backend/i,
    // Block GRANT/REVOKE
    /GRANT\s+/i,
    /REVOKE\s+/i,
    // Block CREATE/ALTER/DROP ROLE/USER
    /(?:CREATE|ALTER|DROP)\s+(?:ROLE|USER)/i,
    // Block SET ROLE
    /SET\s+ROLE/i,
];

function isSafeQuery(sql: string): boolean {
    return !DANGEROUS_PATTERNS.some(pattern => pattern.test(sql));
}

/**
 * Check if a SQL statement contains DDL targeting system/internal tables.
 */
function isDdlOnSystemTable(sql: string): boolean {
    const ddlPattern = /(?:CREATE|ALTER|DROP|TRUNCATE)\s+(?:TABLE\s+)?(?:IF\s+(?:NOT\s+)?EXISTS\s+)?/i;
    if (!ddlPattern.test(sql)) return false;

    return SYSTEM_TABLES.some(table => {
        const tablePattern = new RegExp(
            `(?:CREATE|ALTER|DROP|TRUNCATE)\\s+(?:TABLE\\s+)?(?:IF\\s+(?:NOT\\s+)?EXISTS\\s+)?(?:"?${table}"?)`,
            'i'
        );
        return tablePattern.test(sql);
    });
}

/**
 * Detect schema references outside the allowed schemas (project schema, public, information_schema).
 * Blocks queries like: pg_catalog.pg_tables, other_project.secret_data, etc.
 */
function containsSchemaEscape(sql: string, projectId: number | null): boolean {
    // Match patterns like "schema_name"."table" or schema_name.table
    const schemaRefPattern = /(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))\s*\.\s*(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = schemaRefPattern.exec(sql)) !== null) {
        const schemaName = match[1] || match[2];
        // Allow: public, the project's own schema (p{projectId}), information_schema
        const allowedSchemas = ['public', 'information_schema'];
        if (projectId) allowedSchemas.push(`p${projectId}`);
        if (!allowedSchemas.includes(schemaName.toLowerCase())) {
            return true; // Found a schema reference outside allowed schemas
        }
    }
    return false;
}

export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve projectId from auth or request body/query params
    let resolvedProjectId: number | null = auth.projectId || null;

    // For session auth without auth.projectId, require projectId from request
    if (auth.method === 'session' && !auth.projectId) {
        // We need to peek at the body for projectId, but also need sql/params later
        // Parse body first
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const bodyProjectId = body.projectId;
        const { searchParams } = new URL(req.url);
        const queryParamProjectId = searchParams.get('projectId');

        const projectIdRaw = bodyProjectId ?? queryParamProjectId;

        if (projectIdRaw == null) {
            return NextResponse.json(
                { error: 'Project ID is required for session-based access' },
                { status: 400 }
            );
        }

        const pid = parseInt(String(projectIdRaw), 10);
        if (isNaN(pid)) {
            return NextResponse.json(
                { error: 'Project ID is required for session-based access' },
                { status: 400 }
            );
        }

        // Verify user has access to this project
        const hasAccess = await checkProjectAccess(pid, auth.userId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Access denied to this project' },
                { status: 403 }
            );
        }

        resolvedProjectId = pid;

        // Store parsed body for later use
        (req as any)._parsedBody = body;
    }

    // Rate limiting check (currently unlimited but tracks usage)
    const rateProjectId = resolvedProjectId || 0;
    const rateCheck = await checkRateLimit(rateProjectId);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        // Get body — either already parsed (session auth path) or parse now
        const body = (req as any)._parsedBody || await req.json();
        const { sql, params = [] } = body;

        if (!sql || typeof sql !== 'string') {
            return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
        }

        // Security check for dangerous queries
        if (!isSafeQuery(sql)) {
            return NextResponse.json({
                error: 'Query blocked: Contains potentially dangerous operations',
                hint: 'DROP DATABASE, ALTER SYSTEM, and similar commands are not allowed.'
            }, { status: 403 });
        }

        // Check for DDL on system tables
        if (isDdlOnSystemTable(sql)) {
            return NextResponse.json(
                { error: 'Query blocked: Cannot modify system tables' },
                { status: 403 }
            );
        }

        // Check for schema-escape attempts
        if (containsSchemaEscape(sql, resolvedProjectId)) {
            return NextResponse.json(
                { error: 'Query blocked: Cross-schema access not allowed' },
                { status: 403 }
            );
        }

        // Execute the query
        const startTime = Date.now();

        // Set search_path for ALL authenticated requests with a projectId
        if (resolvedProjectId) {
            await query(`SET search_path TO p${resolvedProjectId}, public`);
        }

        const result = await query(sql, params);
        const executionTime = Date.now() - startTime;

        // Determine if this was a SELECT or a mutation
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        // Webhook Trigger (Fire & Forget Simulation)
        if (!isSelect && resolvedProjectId) {
            (async () => {
                try {
                    // Naive Regex to find table
                    let table = '';
                    const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
                    const updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
                    const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);

                    if (insertMatch) table = insertMatch[1];
                    else if (updateMatch) table = updateMatch[1];
                    else if (deleteMatch) table = deleteMatch[1];

                    let eventType = insertMatch ? 'INSERT' : updateMatch ? 'UPDATE' : deleteMatch ? 'DELETE' : 'UNKNOWN';

                    if (table) {
                        const hooks = await query(`
                            SELECT target_url, secret FROM webhooks 
                            WHERE project_id = $1 AND table_name = $2 AND (event = $3 OR event = '*')
                        `, [resolvedProjectId, table, eventType]);

                        for (const hook of hooks.rows) {
                            fetch(hook.target_url, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Vectabase-Event': eventType,
                                    'X-Vectabase-Table': table,
                                    'X-Vectabase-Secret': hook.secret || ''
                                },
                                body: JSON.stringify({
                                    table,
                                    event: eventType,
                                    timestamp: new Date().toISOString(),
                                    data: result.rows // Might be empty if no RETURNING
                                })
                            }).catch(err => console.error("Webhook Delivery Failed", hook.target_url, err));
                        }
                    }
                } catch (e) {
                    console.error("Webhook Trigger Error", e);
                }
            })();
        }

        return NextResponse.json({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map((f: any) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
            })),
            executionTime,
            command: isSelect ? 'SELECT' : (result.command || 'UNKNOWN'),
        }, {
            headers: getRateLimitHeaders(rateProjectId)
        });
    } catch (error: any) {
        console.error('SQL execution error:', error);
        return NextResponse.json({
            error: error.message,
            position: error.position,
            hint: error.hint,
            detail: error.detail,
        }, { status: 400, headers: getRateLimitHeaders(rateProjectId) });
    }
}
