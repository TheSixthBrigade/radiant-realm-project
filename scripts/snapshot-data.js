/**
 * snapshot-data.js
 * Exports local database state to a SQL file in the database/ directory.
 * This allows "test data" to be committed to Git and synced to servers.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from root
dotenv.config();

// Load from event-horizon-ui LAST so it overrides with specificity
const uiEnvPath = path.join(__dirname, '..', 'database', 'event-horizon-ui', '.env.local');
dotenv.config({ path: uiEnvPath, override: true });

async function snapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(__dirname, '..', 'database', `999_snapshot_${timestamp}.sql`);

    console.log('📸 Creating data snapshot...');

    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_NAME || 'vectabase';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';

    // Try to find pg_dump on Windows if not in PATH
    let pgDump = 'pg_dump';
    if (process.platform === 'win32') {
        const commonPaths = [
            'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe'
        ];
        for (const p of commonPaths) {
            try {
                await fs.access(p);
                pgDump = `"${p}"`;
                break;
            } catch { }
        }
    }

    const pgDumpCmd = `${pgDump} -h ${host} -p ${port} -U ${user} -d ${database} --data-only --inserts --exclude-table=_migrations -f "${outputFile}"`;

    try {
        console.log(`Connecting to ${user}@${host}:${port}/${database}...`);
        await execAsync(pgDumpCmd, {
            env: { ...process.env, PGPASSWORD: password }
        });

        // Check if file has content
        const stats = await fs.stat(outputFile);
        if (stats.size < 100) {
            console.warn('⚠️  Snapshot seems very small. Did you export anything?');
        }

        console.log(`\n✅ Snapshot created: database/${path.basename(outputFile)}`);
        console.log('🚀 Next steps:');
        console.log('1. git add .');
        console.log('2. git commit -m "Add data snapshot"');
        console.log('3. git push');
        console.log('\nWhen you run deploy.sh on the server, this data will be applied automatically.');

    } catch (error) {
        console.error('\n❌ Snapshot failed!');
        console.error(error.message);
        if (error.message.includes('pg_dump')) {
            console.log('\n💡 Make sure PostgreSQL tools are in your PATH.');
        }
    }
}

snapshot();
