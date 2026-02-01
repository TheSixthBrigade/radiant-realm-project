import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import { checkRateLimit, trackEgress, getRateLimitHeaders } from '@/lib/rateLimit';

// Dangerous SQL patterns that should be blocked
const DANGEROUS_PATTERNS = [
    /DROP\s+DATABASE/i,
    /TRUNCATE\s+.*CASCADE/i,
    /ALTER\s+SYSTEM/i,
    /pg_terminate_backend/i,
    /pg_cancel_backend/i,
];

function isSafeQuery(sql: string): boolean {
    return !DANGEROUS_PATTERNS.some(pattern => pattern.test(sql));
}

export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting check (currently unlimited but tracks usage)
    const projectId = auth.projectId || 0;
    const rateCheck = await checkRateLimit(projectId);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        const { sql, params = [] } = await req.json();

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

        // Execute the query
        const startTime = Date.now();

        // isolation: Set search path if it's a project-scoped key
        if (auth.projectId) {
            await query(`SET search_path TO p${auth.projectId}, public`);
        }

        const result = await query(sql, params);
        const executionTime = Date.now() - startTime;

        // Determine if this was a SELECT or a mutation
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        // Webhook Trigger (Fire & Forget Simulation)
        if (!isSelect && auth.projectId) {
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
                        `, [auth.projectId, table, eventType]);

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
            headers: getRateLimitHeaders(projectId)
        });
    } catch (error: any) {
        console.error('SQL execution error:', error);
        return NextResponse.json({
            error: error.message,
            position: error.position,
            hint: error.hint,
            detail: error.detail,
        }, { status: 400, headers: getRateLimitHeaders(projectId) });
    }
}
