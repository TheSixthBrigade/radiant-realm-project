import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { sanitizeSqlIdentifier, checkProjectAccess } from '@/lib/security';

/**
 * Helper: Resolve and validate projectId for the current request.
 * - For API key auth, projectId comes from auth.projectId.
 * - For session auth, projectId must be provided (via param).
 * - Returns { projectId, errorResponse } — if errorResponse is set, return it immediately.
 */
async function resolveProjectId(
    auth: any,
    projectIdParam: string | null
): Promise<{ projectId: number | null; errorResponse: NextResponse | null }> {
    // API key auth already has projectId bound
    if (auth.method === 'api_key' && auth.projectId) {
        return { projectId: auth.projectId, errorResponse: null };
    }

    // Session auth — require projectId param
    if (auth.method === 'session' && !auth.projectId) {
        if (!projectIdParam) {
            return {
                projectId: null,
                errorResponse: NextResponse.json(
                    { error: 'Project ID is required for session-based access' },
                    { status: 400 }
                ),
            };
        }

        const pid = parseInt(projectIdParam, 10);
        if (isNaN(pid)) {
            return {
                projectId: null,
                errorResponse: NextResponse.json(
                    { error: 'Project ID is required for session-based access' },
                    { status: 400 }
                ),
            };
        }

        // Verify user has access to this project
        const hasAccess = await checkProjectAccess(pid, auth.userId);
        if (!hasAccess) {
            return {
                projectId: null,
                errorResponse: NextResponse.json(
                    { error: 'Access denied to this project' },
                    { status: 403 }
                ),
            };
        }

        return { projectId: pid, errorResponse: null };
    }

    // Fallback: use whatever is available
    const pid = projectIdParam ? parseInt(projectIdParam, 10) : (auth.projectId || null);
    return { projectId: pid, errorResponse: null };
}

// GET: Fetch rows from a table with pagination (filtered by project_id)
export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting (unlimited but tracks usage)
    const rateCheck = await checkRateLimit(auth.projectId || 0);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || '';
    const orderDir = searchParams.get('orderDir') === 'desc' ? 'DESC' : 'ASC';
    const projectIdParam = searchParams.get('projectId');

    // Enforce project ID for session auth
    const { projectId, errorResponse } = await resolveProjectId(auth, projectIdParam);
    if (errorResponse) return errorResponse;

    if (!table) {
        return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Sanitize SQL identifiers
    const safeSchema = sanitizeSqlIdentifier(schema);
    const safeTable = sanitizeSqlIdentifier(table);
    const safeOrderBy = orderBy ? sanitizeSqlIdentifier(orderBy) : '';

    try {
        // Validate table exists to prevent SQL injection
        const tableCheck = await query(`
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2
        `, [safeSchema, safeTable]);

        if (tableCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 });
        }

        // Check if table has project_id column for filtering
        const hasProjectId = await query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2 AND column_name = 'project_id'
        `, [safeSchema, safeTable]);

        let sql: string;
        let countSql: string;
        let params: any[];
        let countParams: any[];

        if (hasProjectId.rows.length > 0 && projectId) {
            // Table has project_id - filter by it for data isolation
            sql = `SELECT * FROM "${safeSchema}"."${safeTable}" WHERE project_id = $1`;
            countSql = `SELECT COUNT(*) as total FROM "${safeSchema}"."${safeTable}" WHERE project_id = $1`;
            params = [projectId];
            countParams = [projectId];

            if (safeOrderBy) {
                sql += ` ORDER BY "${safeOrderBy}" ${orderDir}`;
            }
            sql += ` LIMIT $2 OFFSET $3`;
            params.push(limit, offset);
        } else {
            // No project_id column or no projectId - return all rows (legacy behavior)
            sql = `SELECT * FROM "${safeSchema}"."${safeTable}"`;
            countSql = `SELECT COUNT(*) as total FROM "${safeSchema}"."${safeTable}"`;
            params = [];
            countParams = [];

            if (safeOrderBy) {
                sql += ` ORDER BY "${safeOrderBy}" ${orderDir}`;
            }
            sql += ` LIMIT $1 OFFSET $2`;
            params.push(limit, offset);
        }

        console.log('Fetching rows with SQL:', sql, 'Params:', params);
        const result = await query(sql, params);
        console.log('Rows result:', result.rows.length, 'rows');

        // Get total count
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0]?.total || '0');
        console.log('Total count:', total);

        const response = NextResponse.json({
            rows: result.rows,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
        });
        // Prevent caching
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error: any) {
        console.error('Row fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Insert a new row
export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting (unlimited but tracks usage)
    const rateCheck = await checkRateLimit(auth.projectId || 0);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { table, schema = 'public', data, projectId: bodyProjectId } = body;

        // Enforce project ID for session auth
        const projectIdStr = bodyProjectId != null ? String(bodyProjectId) : null;
        const { projectId, errorResponse } = await resolveProjectId(auth, projectIdStr);
        if (errorResponse) return errorResponse;

        if (!table || !data || typeof data !== 'object') {
            return NextResponse.json({ error: 'Table and data are required' }, { status: 400 });
        }

        // Sanitize SQL identifiers
        const safeSchema = sanitizeSqlIdentifier(schema);
        const safeTable = sanitizeSqlIdentifier(table);

        const columns = Object.keys(data);
        const values = Object.values(data);
        // Sanitize column names
        const safeColumns = columns.map(c => sanitizeSqlIdentifier(c));
        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const placeholders = safeColumns.map((_, i) => '$' + (i + 1)).join(', ');
        const columnList = safeColumns.map(c => '"' + c + '"').join(', ');

        const sql = `INSERT INTO "${safeSchema}"."${safeTable}" (${columnList}) VALUES (${placeholders}) RETURNING *`;
        console.log('Insert SQL:', sql, 'Values:', values);
        const result = await query(sql, values);
        console.log('Insert result rows:', result.rows);

        // Verify the insert by immediately querying
        const verifyResult = await query(`SELECT * FROM "${safeSchema}"."${safeTable}" ORDER BY id DESC LIMIT 5`);
        console.log('Verify query result:', verifyResult.rows);

        return NextResponse.json({ success: true, row: result.rows[0], verified: verifyResult.rows });
    } catch (error: any) {
        console.error('Row insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update an existing row
export async function PUT(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting (unlimited but tracks usage)
    const rateCheck = await checkRateLimit(auth.projectId || 0);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { table, schema = 'public', data, where, projectId: bodyProjectId } = body;

        // Enforce project ID for session auth
        const projectIdStr = bodyProjectId != null ? String(bodyProjectId) : null;
        const { projectId, errorResponse } = await resolveProjectId(auth, projectIdStr);
        if (errorResponse) return errorResponse;

        if (!table || !data || !where) {
            return NextResponse.json({ error: 'Table, data, and where clause are required' }, { status: 400 });
        }

        // Sanitize SQL identifiers
        const safeSchema = sanitizeSqlIdentifier(schema);
        const safeTable = sanitizeSqlIdentifier(table);

        const setColumns = Object.keys(data);
        const setValues = Object.values(data);
        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);

        // Sanitize column names
        const safeSetColumns = setColumns.map(c => sanitizeSqlIdentifier(c));
        const safeWhereColumns = whereColumns.map(c => sanitizeSqlIdentifier(c));

        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const setClause = safeSetColumns.map((col, i) => '"' + col + '" = $' + (i + 1)).join(', ');
        const whereClause = safeWhereColumns.map((col, i) => '"' + col + '" = $' + (safeSetColumns.length + i + 1)).join(' AND ');

        const sql = `UPDATE "${safeSchema}"."${safeTable}" SET ${setClause} WHERE ${whereClause} RETURNING *`;
        console.log('Update SQL:', sql);
        const result = await query(sql, [...setValues, ...whereValues]);

        return NextResponse.json({ success: true, row: result.rows[0], rowsAffected: result.rowCount });
    } catch (error: any) {
        console.error('Row update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a row
export async function DELETE(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting (unlimited but tracks usage)
    const rateCheck = await checkRateLimit(auth.projectId || 0);
    if (!rateCheck.allowed) {
        return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { table, schema = 'public', where, projectId: bodyProjectId } = body;

        // Enforce project ID for session auth
        const projectIdStr = bodyProjectId != null ? String(bodyProjectId) : null;
        const { projectId, errorResponse } = await resolveProjectId(auth, projectIdStr);
        if (errorResponse) return errorResponse;

        if (!table || !where) {
            return NextResponse.json({ error: 'Table and where clause are required' }, { status: 400 });
        }

        // Sanitize SQL identifiers
        const safeSchema = sanitizeSqlIdentifier(schema);
        const safeTable = sanitizeSqlIdentifier(table);

        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);
        // Sanitize where column names
        const safeWhereColumns = whereColumns.map(c => sanitizeSqlIdentifier(c));
        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const whereClause = safeWhereColumns.map((col, i) => '"' + col + '" = $' + (i + 1)).join(' AND ');

        const sql = `DELETE FROM "${safeSchema}"."${safeTable}" WHERE ${whereClause} RETURNING *`;
        console.log('Delete SQL:', sql);
        const result = await query(sql, whereValues);

        return NextResponse.json({ success: true, deleted: result.rows, rowsAffected: result.rowCount });
    } catch (error: any) {
        console.error('Row delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
