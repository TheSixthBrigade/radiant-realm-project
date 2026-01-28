
import { Pool } from 'pg';
import { encrypt, deriveProjectKey } from '../lib/crypto';
import crypto from 'crypto';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const query = (text: string, params?: any[]) => pool.query(text, params);

/**
 * Dynamically retrieves or generates a project-specific key
 */
async function getProjectKey(projectId: number): Promise<Buffer> {
    const res = await query('SELECT encryption_salt FROM projects WHERE id = $1', [projectId]);
    let salt = res.rows[0]?.encryption_salt;

    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
        await query('UPDATE projects SET encryption_salt = $1 WHERE id = $2', [salt, projectId]);
    }

    return deriveProjectKey(salt);
}

async function setSecret(projectId: number, name: string, value: string) {
    console.log(`🔒 Setting secret "${name}" for project ${projectId}...`);

    const projectKey = await getProjectKey(projectId);
    const encrypted = encrypt(value, projectKey);

    await query(`
        INSERT INTO vault_secrets (project_id, name, value, description, updated_at)
        VALUES ($1, $2, $3, 'CLI Managed Secret', NOW())
        ON CONFLICT (project_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [projectId, name, encrypted]);

    console.log(`✅ Secret "${name}" stored and encrypted successfully.`);
}

async function main() {
    try {
        const args = process.argv.slice(2);
        if (args.length < 3) {
            console.log("Usage: npx tsx scripts/vectabase_vault.ts [projectId] [secretName] [value]");
            process.exit(1);
        }

        const projectId = parseInt(args[0]);
        const name = args[1];
        const value = args[2];

        await setSecret(projectId, name, value);
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

main();
