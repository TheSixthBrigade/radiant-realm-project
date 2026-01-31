import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

async function verifyAccess(req: NextRequest) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return { authorized: false };
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        if (payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com') {
            return { authorized: true };
        }
        return { authorized: true };
    } catch {
        return { authorized: false };
    }
}

// Ensure realtime subscription tables exist
async function ensureRealtimeTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS realtime_subscriptions (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            channel_name TEXT NOT NULL,
            table_name TEXT,
            event_types TEXT[] DEFAULT ARRAY['INSERT', 'UPDATE', 'DELETE'],
            filter JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, channel_name)
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS realtime_broadcasts (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            channel_name TEXT NOT NULL,
            event_name TEXT NOT NULL,
            payload JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

// GET: Fetch live database activity and stats
export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Get active database queries from pg_stat_activity
        const activityResult = await query(`
            SELECT 
                pid,
                datname,
                usename,
                state,
                LEFT(query, 200) as query,
                query_start,
                state_change,
                wait_event_type,
                wait_event
            FROM pg_stat_activity 
            WHERE state IS NOT NULL 
              AND query NOT LIKE '%pg_stat_activity%'
              AND datname = current_database()
            ORDER BY query_start DESC NULLS LAST
            LIMIT 20
        `);

        // Get database stats
        const statsResult = await query(`
            SELECT 
                numbackends as connections,
                xact_commit + xact_rollback as total_transactions,
                blks_hit,
                blks_read,
                tup_returned,
                tup_fetched,
                tup_inserted,
                tup_updated,
                tup_deleted
            FROM pg_stat_database 
            WHERE datname = current_database()
        `);

        const dbStats = statsResult.rows[0] || {};
        
        // Calculate throughput estimate (simplified)
        const throughput = ((dbStats.tup_returned || 0) + (dbStats.tup_fetched || 0)) / 1000;

        return NextResponse.json({
            activity: activityResult.rows,
            stats: {
                connections: dbStats.connections || 0,
                latency: Math.floor(Math.random() * 15) + 5, // Simulated latency in ms
                throughput: throughput.toFixed(1),
                uptime: '99.99%',
                transactions: dbStats.total_transactions || 0,
                inserts: dbStats.tup_inserted || 0,
                updates: dbStats.tup_updated || 0,
                deletes: dbStats.tup_deleted || 0
            }
        });
    } catch (error: any) {
        console.error('Realtime fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create subscription or broadcast message
export async function POST(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureRealtimeTables();

        const { projectId, action, channelName, tableName, eventTypes, filter, eventName, payload } = await req.json();

        if (!projectId || !channelName) {
            return NextResponse.json({ error: 'Project ID and channel name are required' }, { status: 400 });
        }

        if (action === 'subscribe') {
            await query(`
                INSERT INTO realtime_subscriptions (project_id, channel_name, table_name, event_types, filter)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (project_id, channel_name) DO UPDATE
                SET table_name = EXCLUDED.table_name, event_types = EXCLUDED.event_types, filter = EXCLUDED.filter
                RETURNING *
            `, [projectId, channelName, tableName || null, eventTypes || ['INSERT', 'UPDATE', 'DELETE'], filter || null]);

            return NextResponse.json({ success: true, message: `Subscribed to channel "${channelName}"` });
        } else if (action === 'broadcast') {
            if (!eventName) {
                return NextResponse.json({ error: 'Event name is required for broadcast' }, { status: 400 });
            }

            await query(`
                INSERT INTO realtime_broadcasts (project_id, channel_name, event_name, payload)
                VALUES ($1, $2, $3, $4)
            `, [projectId, channelName, eventName, payload || {}]);

            return NextResponse.json({ success: true, message: `Broadcast sent to "${channelName}"` });
        } else {
            return NextResponse.json({ error: 'Action must be "subscribe" or "broadcast"' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Realtime create error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Unsubscribe from channel
export async function DELETE(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { projectId, channelName } = await req.json();

        if (!projectId || !channelName) {
            return NextResponse.json({ error: 'Project ID and channel name are required' }, { status: 400 });
        }

        await query('DELETE FROM realtime_subscriptions WHERE project_id = $1 AND channel_name = $2', [projectId, channelName]);

        return NextResponse.json({ success: true, message: `Unsubscribed from "${channelName}"` });
    } catch (error: any) {
        console.error('Realtime delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
