#!/usr/bin/env node
/**
 * Import PostgreSQL dump into local database
 * Run: node import-data.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DUMP_FILE = path.join(__dirname, 'dumped_postsql data.sql');
const DB_PASSWORD = 'your-super-secret-and-long-postgres-password';

async function main() {
    console.log('=== PostgreSQL Data Import ===\n');

    // Check if dump file exists
    if (!fs.existsSync(DUMP_FILE)) {
        console.error('ERROR: Dump file not found:', DUMP_FILE);
        process.exit(1);
    }

    console.log('Dump file found:', DUMP_FILE);
    const stats = fs.statSync(DUMP_FILE);
    console.log('File size:', (stats.size / 1024).toFixed(2), 'KB\n');

    // Try Docker first, then local psql
    const methods = [
        {
            name: 'Docker container',
            check: 'docker ps --filter "name=postgres" --format "{{.Names}}"',
            import: `docker exec -i database-postgres-1 psql -U postgres postgres < "${DUMP_FILE}"`,
            importAlt: `docker exec -i database_postgres_1 psql -U postgres postgres < "${DUMP_FILE}"`
        },
        {
            name: 'Local psql',
            check: 'psql --version',
            import: `set PGPASSWORD=${DB_PASSWORD}&& psql -h localhost -p 5432 -U postgres -d postgres -f "${DUMP_FILE}"`
        }
    ];

    for (const method of methods) {
        try {
            console.log(`Trying ${method.name}...`);
            execSync(method.check, { stdio: 'pipe' });
            
            console.log(`Using ${method.name} to import data...`);
            console.log('This may take a moment...\n');
            
            try {
                execSync(method.import, { stdio: 'inherit', shell: true });
            } catch (e) {
                if (method.importAlt) {
                    console.log('Trying alternative container name...');
                    execSync(method.importAlt, { stdio: 'inherit', shell: true });
                } else {
                    throw e;
                }
            }
            
            console.log('\n✅ Data imported successfully!');
            console.log('\nYou can now restart the Event Horizon UI:');
            console.log('  npm run dev');
            return;
        } catch (err) {
            console.log(`${method.name} not available, trying next...\n`);
        }
    }

    console.error('ERROR: Could not find a way to import data.');
    console.error('Make sure either Docker or PostgreSQL is installed and running.');
    console.error('\nManual import command:');
    console.error(`  psql -h localhost -p 5432 -U postgres -d postgres -f "${DUMP_FILE}"`);
    process.exit(1);
}

main().catch(console.error);
