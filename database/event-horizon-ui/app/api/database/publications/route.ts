import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

export async function GET(request: NextRequest) {
    try {
        const query = `
            SELECT 
                p.pubname,
                p.pubowner::regrole AS owner,
                p.puballtables AS all_tables,
                p.pubinsert,
                p.pubupdate,
                p.pubdelete,
                p.pubtruncate,
                COALESCE(
                    (SELECT array_agg(pt.tablename) 
                     FROM pg_publication_tables pt 
                     WHERE pt.pubname = p.pubname),
                    ARRAY[]::text[]
                ) AS tables
            FROM pg_catalog.pg_publication p
            ORDER BY p.pubname;
        `;

        const result = await pool.query(query);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching publications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, tables = [], allTables = false } = body;

        if (!name) {
            return NextResponse.json({ error: 'Publication name is required' }, { status: 400 });
        }

        let createQuery;
        if (allTables) {
            createQuery = `CREATE PUBLICATION "${name}" FOR ALL TABLES;`;
        } else if (tables.length > 0) {
            const tableList = tables.map((t: string) => `"${t}"`).join(', ');
            createQuery = `CREATE PUBLICATION "${name}" FOR TABLE ${tableList};`;
        } else {
            createQuery = `CREATE PUBLICATION "${name}";`;
        }

        await pool.query(createQuery);
        return NextResponse.json({ success: true, message: `Publication ${name} created successfully` });
    } catch (error: any) {
        console.error('Error creating publication:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Publication name is required' }, { status: 400 });
    }

    try {
        const dropQuery = `DROP PUBLICATION IF EXISTS "${name}";`;
        await pool.query(dropQuery);
        return NextResponse.json({ success: true, message: `Publication ${name} dropped successfully` });
    } catch (error: any) {
        console.error('Error dropping publication:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
