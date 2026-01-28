import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import { encrypt, decrypt, sha256, deriveProjectKey } from '@/lib/crypto';
import crypto from 'crypto';

// Ensure vault table exists
async function ensureVaultTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS vault_secrets (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            value TEXT NOT NULL, -- Encrypted content
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, name)
        )
    `);
}

/**
 * Dynamically retrieves or generates a project-specific key
 */
async function getProjectKey(projectId: string | number): Promise<Buffer> {
    const res = await query('SELECT encryption_salt FROM projects WHERE id = $1', [projectId]);
    let salt = res.rows[0]?.encryption_salt;

    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
        await query('UPDATE projects SET encryption_salt = $1 WHERE id = $2', [salt, projectId]);
    }

    return deriveProjectKey(salt);
}

// GET: List secrets for a project
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const decryptValue = searchParams.get('decrypt') === 'true';

    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const { authorized } = await verifyAccess(req, projectId);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureVaultTable();
        const projectKey = await getProjectKey(projectId);

        const result = await query(`
            SELECT id, name, description, value, created_at, updated_at
            FROM vault_secrets
            WHERE project_id = $1
            ORDER BY name
        `, [projectId]);

        const secrets = result.rows.map((row: any) => {
            try {
                const decrypted = decrypt(row.value, projectKey);
                return {
                    ...row,
                    value: sha256(decrypted) // Return hash digest only
                };
            } catch (e) {
                console.error(`Failed to decrypt secret ${row.id}:`, e);
                return { ...row, value: '[DECRYPTION_FAILED]' };
            }
        });

        return NextResponse.json(secrets);

    } catch (error: any) {
        console.error('Vault fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create or Update a secret
export async function POST(req: NextRequest) {
    try {
        const { projectId, name, value, description } = await req.json();

        if (!projectId || !name || !value) {
            return NextResponse.json({ error: 'Project ID, name, and value are required' }, { status: 400 });
        }

        // Validate name format (uppercase/underscore standard for env vars)
        if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
            return NextResponse.json({ error: 'Secret name must use UPPERCASE letters, numbers, and underscores (e.g. API_KEY)' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureVaultTable();

        const projectKey = await getProjectKey(projectId);
        const encryptedValue = encrypt(value, projectKey);

        await query(`
            INSERT INTO vault_secrets (project_id, name, value, description, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (project_id, name) DO UPDATE
            SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW()
        `, [projectId, name, encryptedValue, description || '']);

        return NextResponse.json({ success: true, message: 'Secret stored successfully' });

    } catch (error: any) {
        console.error('Vault save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a secret
export async function DELETE(req: NextRequest) {
    try {
        const { projectId, id } = await req.json();

        if (!projectId || !id) {
            return NextResponse.json({ error: 'Project ID and Secret ID are required' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await query('DELETE FROM vault_secrets WHERE project_id = $1 AND id = $2', [projectId, id]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Vault delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
