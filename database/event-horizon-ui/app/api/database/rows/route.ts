import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';

// GET: Fetch rows from a table with pagination
export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') || '';
    const orderDir = searchParams.get('orderDir') === 'desc' ? 'DESC' : 'ASC';

    if (!table) {
        return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    try {
        // Validate table exists to prevent SQL injection
        const tableCheck = await query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
        `, [schema, table]);

        if (tableCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 });
        }

        // Build query with optional ordering
        let sql = `SELECT * FROM "${schema}"."${table}"`;
        if (orderBy) {
            sql += ` ORDER BY "${orderBy}" ${orderDir}`;
        }
        sql += ` LIMIT $1 OFFSET $2`;

        console.log('Fetching rows with SQL:', sql, 'Params:', [limit, offset]);
        const result = await query(sql, [limit, offset]);
        console.log('Rows result:', result.rows.length, 'rows');

        // Get total count
        const countResult = await query(`SELECT COUNT(*) as total FROM "${schema}"."${table}"`);
        const total = parseInt(countResult.rows[0]?.total || '0');
        console.log('Total count:', total);

        return NextResponse.json({
            rows: result.rows,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
        });
    } catch (error: any) {
        console.error('Row fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Insert a new row
export async function POST(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { table, schema = 'public', data } = await req.json();

        if (!table || !data || typeof data !== 'object') {
            return NextResponse.json({ error: 'Table and data are required' }, { status: 400 });
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const placeholders = columns.map((_, i) => '$' + (i + 1)).join(', ');
        const columnList = columns.map(c => '"' + c + '"').join(', ');

        const sql = `INSERT INTO "${schema}"."${table}" (${columnList}) VALUES (${placeholders}) RETURNING *`;
        console.log('Insert SQL:', sql, 'Values:', values);
        const result = await query(sql, values);

        return NextResponse.json({ success: true, row: result.rows[0] });
    } catch (error: any) {
        console.error('Row insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update an existing row
export async function PUT(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { table, schema = 'public', data, where } = await req.json();

        if (!table || !data || !where) {
            return NextResponse.json({ error: 'Table, data, and where clause are required' }, { status: 400 });
        }

        const setColumns = Object.keys(data);
        const setValues = Object.values(data);
        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);

        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const setClause = setColumns.map((col, i) => '"' + col + '" = $' + (i + 1)).join(', ');
        const whereClause = whereColumns.map((col, i) => '"' + col + '" = $' + (setColumns.length + i + 1)).join(' AND ');

        const sql = `UPDATE "${schema}"."${table}" SET ${setClause} WHERE ${whereClause} RETURNING *`;
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
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { table, schema = 'public', where } = await req.json();

        if (!table || !where) {
            return NextResponse.json({ error: 'Table and where clause are required' }, { status: 400 });
        }

        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);
        // CRITICAL: PostgreSQL placeholders must have $ prefix
        const whereClause = whereColumns.map((col, i) => '"' + col + '" = $' + (i + 1)).join(' AND ');

        const sql = `DELETE FROM "${schema}"."${table}" WHERE ${whereClause} RETURNING *`;
        console.log('Delete SQL:', sql);
        const result = await query(sql, whereValues);

        return NextResponse.json({ success: true, deleted: result.rows, rowsAffected: result.rowCount });
    } catch (error: any) {
        console.error('Row delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
