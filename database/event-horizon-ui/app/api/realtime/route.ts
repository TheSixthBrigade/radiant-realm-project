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

// GET: List channels and subscriptions
export async function GET(req: NextRequest) {
    const { authorized } = await verifyAccess(req);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    try {
        await ensureRealtimeTables();

        // Get subscriptions
        const subscriptions = await query(`
            SELECT * FROM realtime_subscriptions WHERE project_id = $1 ORDER BY created_at DESC
        `, [projectId]);

        // Get recent broadcasts
        const broadcasts = await query(`
            SELECT * FROM realtime_broadcasts 
            WHERE project_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [projectId]);

        // Get active connection count (simulated for now)
        const connectionCount = Math.floor(Math.random() * 100) + 10;

        return NextResponse.json({
            subscriptions: subscriptions.rows,
            recent_broadcasts: broadcasts.rows,
            active_connections: connectionCount,
            status: 'connected'
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
