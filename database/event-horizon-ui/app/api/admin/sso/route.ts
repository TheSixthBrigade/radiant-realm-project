import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';

// Lattice master key for emergency admin access
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY || 'vectabase-lattice-2026-master-key';

async function verifyLatticeAdmin(req: NextRequest): Promise<boolean> {
    // Check for Lattice admin cookie
    const latticeToken = req.cookies.get('lattice_admin')?.value;
    if (latticeToken === LATTICE_MASTER_KEY) {
        return true;
    }

    // Check JWT for Lattice admin flag
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return false;

    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        return payload.isLatticeAdmin === true;
    } catch {
        return false;
    }
}

/**
 * GET /api/admin/sso
 * List all SSO configurations (Lattice admin only)
 */
export async function GET(req: NextRequest) {
    if (!await verifyLatticeAdmin(req)) {
        return NextResponse.json({ error: 'Lattice admin access required' }, { status: 403 });
    }

    try {
        const result = await query(`
            SELECT 
                s.id, s.domain, s.enabled, s.idp_type, s.idp_url,
                s.auto_provision_users, s.default_role, s.allowed_project_ids,
                s.created_at, s.updated_at,
                u.email as created_by_email
            FROM sso_configurations s
            LEFT JOIN users u ON s.created_by = u.id
            ORDER BY s.domain
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        // Table might not exist yet
        if (error.message.includes('does not exist')) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/sso
 * Create a new SSO configuration (Lattice admin only)
 */
export async function POST(req: NextRequest) {
    if (!await verifyLatticeAdmin(req)) {
        return NextResponse.json({ error: 'Lattice admin access required' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            domain,
            enabled = true,
            idp_type = 'google',
            idp_url,
            idp_issuer,
            idp_certificate,
            client_id,
            client_secret,
            auto_provision_users = true,
            default_role = 'Member',
            allowed_project_ids
        } = body;

        if (!domain) {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        // Normalize domain
        const normalizedDomain = domain.toLowerCase().trim();

        const result = await query(`
            INSERT INTO sso_configurations (
                domain, enabled, idp_type, idp_url, idp_issuer, idp_certificate,
                client_id, client_secret, auto_provision_users, default_role, allowed_project_ids
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, domain, enabled, idp_type, auto_provision_users, default_role, allowed_project_ids, created_at
        `, [
            normalizedDomain, enabled, idp_type, idp_url || null, idp_issuer || null,
            idp_certificate || null, client_id || null, client_secret || null,
            auto_provision_users, default_role, allowed_project_ids || null
        ]);

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
            return NextResponse.json({ error: 'SSO configuration for this domain already exists' }, { status: 400 });
        }
        // Table might not exist
        if (error.message.includes('does not exist')) {
            return NextResponse.json({ error: 'SSO table not initialized. Please run database migrations.' }, { status: 500 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/admin/sso
 * Update an SSO configuration (Lattice admin only)
 */
export async function PUT(req: NextRequest) {
    if (!await verifyLatticeAdmin(req)) {
        return NextResponse.json({ error: 'Lattice admin access required' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Build dynamic update query
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'domain', 'enabled', 'idp_type', 'idp_url', 'idp_issuer', 'idp_certificate',
            'client_id', 'client_secret', 'auto_provision_users', 'default_role', 'allowed_project_ids'
        ];

        for (const field of allowedFields) {
            if (field in updates) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(updates[field]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        const result = await query(`
            UPDATE sso_configurations 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING id, domain, enabled, idp_type, auto_provision_users, default_role, allowed_project_ids, updated_at
        `, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'SSO configuration not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/sso
 * Delete an SSO configuration (Lattice admin only)
 */
export async function DELETE(req: NextRequest) {
    if (!await verifyLatticeAdmin(req)) {
        return NextResponse.json({ error: 'Lattice admin access required' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const result = await query('DELETE FROM sso_configurations WHERE id = $1 RETURNING id, domain', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'SSO configuration not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deleted: result.rows[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
