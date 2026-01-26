#!/usr/bin/env node
import { Command } from 'commander';
import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const program = new Command();
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.vectabase.json');

function getFullConfig() {
    if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
        const raw = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
        // Migration logic for old format
        if (raw.key && !raw.profiles) {
            return {
                currentProfile: 'default',
                profiles: {
                    default: {
                        key: raw.key,
                        endpoint: raw.endpoint || 'http://localhost:3000',
                        projectId: raw.projectId,
                        projectName: raw.projectName,
                        orgName: raw.orgName
                    }
                }
            };
        }
        return raw;
    }
    return { currentProfile: 'default', profiles: {} };
}

function saveFullConfig(config: any) {
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getActiveProfile() {
    const config = getFullConfig();
    const profileName = config.currentProfile || 'default';
    return config.profiles[profileName] || null;
}

/**
 * Enhanced request wrapper that handles:
 * 1. Bearer Token (Project API Key)
 * 2. Basic Auth (Stealth Layer Nginx)
 */
async function request(options: AxiosRequestConfig) {
    const profile = getActiveProfile();
    if (!profile) {
        throw new Error('No active profile. Run: vectabase login <key>');
    }

    const headers: any = {
        ...options.headers,
        'Authorization': `Bearer ${profile.key}`
    };

    // If Basic Auth is configured for this profile (e.g. hub.vectabase.com)
    if (profile.basicAuth) {
        const [user, pass] = profile.basicAuth.split(':');
        const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
        headers['X-Stealth-Auth'] = `Basic ${encoded}`; // Custom header preferred, or standard:
        headers['Authorization-Basic'] = `Basic ${encoded}`; // Or we merge into a multi-auth if needed
        // Standard Nginx Basic Auth looks for "Authorization: Basic ..."
        // But our API already uses "Authorization: Bearer ...".
        // Strategy: We'll use a custom header for the Nginx bypass if we configure Nginx to look for it,
        // OR we use the standard 'Proxy-Authorization' or similar. 
        // For now, let's assume we use 'Proxy-Authorization' for the stealth layer.
        headers['Proxy-Authorization'] = `Basic ${encoded}`;
    }

    const url = profile.endpoint.endsWith('/') ? profile.endpoint : `${profile.endpoint}/`;
    const fullUrl = url + (options.url?.startsWith('/') ? options.url.substring(1) : options.url);

    return axios({
        ...options,
        url: fullUrl,
        headers
    });
}

function getHash(content: string) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

program
    .name('vectabase')
    .description('CLI for Vectabase - The AI-Native Database Platform')
    .version('0.1.0');

program
    .command('login')
    .description('Authenticate with your Project API Key')
    .argument('<key>', 'Your Project API Key')
    .option('-e, --endpoint <url>', 'API Endpoint', 'http://localhost:3000')
    .option('-p, --profile <name>', 'Profile name', 'default')
    .option('-a, --auth <user:pass>', 'Optional Basic Auth for stealth layer')
    .action(async (key, options) => {
        console.log(`Validating key with Vectabase at ${options.endpoint}...`);
        try {
            const reqHeaders: any = { 'Authorization': `Bearer ${key}` };
            if (options.auth) {
                const encoded = Buffer.from(options.auth).toString('base64');
                reqHeaders['Proxy-Authorization'] = `Basic ${encoded}`;
            }

            const response = await axios.get(`${options.endpoint}/api/auth/verify`, {
                headers: reqHeaders
            });

            if (response.data.authorized) {
                const fullConfig = getFullConfig();
                fullConfig.currentProfile = options.profile;
                fullConfig.profiles[options.profile] = {
                    key,
                    endpoint: options.endpoint,
                    basicAuth: options.auth,
                    projectId: response.data.project?.id,
                    projectName: response.data.project?.name,
                    orgName: response.data.project?.org_name
                };

                saveFullConfig(fullConfig);
                console.log(`✅ Successfully authenticated profile: ${options.profile}`);
                if (response.data.project) {
                    console.log(`Targeting project: ${response.data.project.name} (${response.data.project.org_name})`);
                }
            } else {
                console.error('❌ Authentication failed: Invalid key');
                process.exit(1);
            }
        } catch (error: any) {
            console.error('❌ Login failed:', error.response?.data?.error || error.message);
            process.exit(1);
        }
    });

program
    .command('env')
    .description('Manage environment profiles')
    .argument('[profile]', 'Switch to profile')
    .option('-l, --list', 'List all profiles', false)
    .action((profile, options) => {
        const config = getFullConfig();
        if (options.list) {
            console.log('--- Vectabase Profiles ---');
            Object.keys(config.profiles).forEach(p => {
                const mark = p === config.currentProfile ? '*' : ' ';
                console.log(`${mark} ${p} (${config.profiles[p].endpoint})`);
            });
            return;
        }

        if (profile) {
            if (config.profiles[profile]) {
                config.currentProfile = profile;
                saveFullConfig(config);
                console.log(`✅ Switched to environment: ${profile}`);
            } else {
                console.error(`❌ Profile "${profile}" not found.`);
            }
        } else {
            console.log(`Active Environment: ${config.currentProfile}`);
        }
    });

program
    .command('init')
    .description('Initialize a new Vectabase project in the current directory')
    .action(() => {
        const baseDir = path.join(process.cwd(), 'vectabase');
        const migrationsDir = path.join(baseDir, 'migrations');

        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);
        if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir);

        const schemaPath = path.join(baseDir, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            fs.writeFileSync(schemaPath, '-- Vectabase Schema File\n-- Add your SQL here and run "vectabase db push"\n');
        }

        console.log('Successfully initialized Vectabase project!');
    });

const db = program.command('db').description('Database operations');

db.command('push')
    .description('Push local schema/migrations to the remote database')
    .action(async () => {
        const profile = getActiveProfile();
        if (!profile) return console.error('Not authenticated. Run: vectabase login <key>');

        const migrationsDir = path.join(process.cwd(), 'vectabase', 'migrations');
        const schemaFile = path.join(process.cwd(), 'vectabase', 'schema.sql');

        console.log(`Checking migrations for project: ${profile.projectName} on [${profile.endpoint}]...`);

        try {
            const appliedRes = await request({ url: '/api/migrations' });
            const appliedFiles = new Set(appliedRes.data.map((m: any) => m.filename));

            let migrationFiles: string[] = [];
            if (fs.existsSync(migrationsDir)) {
                migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            }

            let appliedCount = 0;
            for (const file of migrationFiles) {
                if (!appliedFiles.has(file)) {
                    console.log(`Applying migration: ${file}...`);
                    let content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

                    const hash = getHash(content);
                    const queryRes = await request({
                        method: 'POST',
                        url: '/api/database/query',
                        data: { sql: content, projectId: profile.projectId }
                    });

                    if (queryRes.data.success) {
                        await request({
                            method: 'POST',
                            url: '/api/migrations',
                            data: { filename: file, hash: hash }
                        });
                        console.log(`✅ ${file} applied.`);
                        appliedCount++;
                    }
                }
            }

            if (appliedCount === 0 && fs.existsSync(schemaFile)) {
                console.log('Pushing schema.sql (fallback)...');
                const content = fs.readFileSync(schemaFile, 'utf8');
                const queryRes = await request({
                    method: 'POST',
                    url: '/api/database/query',
                    data: { sql: content, projectId: profile.projectId }
                });
                if (queryRes.data.success) console.log('✅ schema.sql pushed.');
            } else if (appliedCount > 0) {
                console.log(`🎉 Success! ${appliedCount} migration(s) applied.`);
            } else {
                console.log('Database is already up to date.');
            }
        } catch (error: any) {
            console.error('❌ Sync failed:', error.response?.data?.error || error.message);
        }
    });

db.command('pull')
    .description('Generate local schema from the remote database')
    .action(async () => {
        const profile = getActiveProfile();
        if (!profile) return console.error('Not authenticated');

        console.log('Pulling schema from Vectabase...');
        try {
            const res = await request({ url: '/api/database/tables' });
            let schemaSql = `-- Vectabase Pulled Schema\n-- From: ${profile.endpoint}\n\n`;

            for (const table of res.data) {
                const colRes = await request({ url: `/api/database/columns?table=${table.table_name}` });
                schemaSql += `CREATE TABLE IF NOT EXISTS ${table.table_name} (\n`;
                const cols = colRes.data.map((c: any) => `  ${c.column_name} ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ' DEFAULT ' + c.column_default : ''}`);
                schemaSql += cols.join(',\n') + `\n);\n\n`;
            }

            const schemaPath = path.join(process.cwd(), 'vectabase', 'schema.sql');
            if (!fs.existsSync(path.dirname(schemaPath))) fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
            fs.writeFileSync(schemaPath, schemaSql);
            console.log(`✅ Schema pulled to ./vectabase/schema.sql`);
        } catch (error: any) {
            console.error('❌ Pull failed:', error.message);
        }
    });

program
    .command('tables')
    .description('List all project tables')
    .action(async () => {
        try {
            const res = await request({ url: '/api/database/tables' });
            console.table(res.data.map((t: any) => ({ Table: t.table_name, Rows: t.row_count_estimate, Columns: t.column_count })));
        } catch (error: any) {
            console.error('❌ Failed:', error.message);
        }
    });

program
    .command('query')
    .description('Execute SQL')
    .argument('<sql>', 'SQL to run')
    .action(async (sql) => {
        try {
            const profile = getActiveProfile();
            const res = await request({
                method: 'POST',
                url: '/api/database/query',
                data: { sql, projectId: profile?.projectId }
            });
            if (res.data.rows) console.table(res.data.rows);
            else console.log(res.data);
        } catch (error: any) {
            console.error('❌ Failed:', error.message);
        }
    });

const functions = program.command('functions').description('Edge function management');

functions.command('deploy')
    .description('Deploy an edge function to Vectabase')
    .argument('<name>', 'Function name')
    .argument('[dir]', 'Directory containing function files', '.')
    .action(async (name, dir) => {
        const profile = getActiveProfile();
        if (!profile) return console.error('Not authenticated');

        const absoluteDir = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(absoluteDir)) {
            console.error(`Directory not found: ${absoluteDir}`);
            process.exit(1);
        }

        console.log(`🚀 Deploying function "${name}" from ${dir}...`);
        try {
            const files: { path: string, content: string }[] = [];
            const scanDir = (currentDir: string, relativeBase: string = '') => {
                const items = fs.readdirSync(currentDir);
                for (const item of items) {
                    if (item === 'node_modules' || item.startsWith('.')) continue;
                    const fullPath = path.join(currentDir, item);
                    const relPath = path.join(relativeBase, item);
                    if (fs.statSync(fullPath).isDirectory()) {
                        scanDir(fullPath, relPath);
                    } else {
                        files.push({ path: relPath.replace(/\\/g, '/'), content: fs.readFileSync(fullPath, 'utf8') });
                    }
                }
            };
            scanDir(absoluteDir);

            const res = await request({
                method: 'POST',
                url: '/api/functions',
                data: { projectId: profile.projectId, name, files }
            });

            console.log(`✅ Function "${name}" deployed!`);
            console.log(`🔗 URL: ${profile.endpoint}/api/v1/functions/${res.data.slug}/invoke`);
        } catch (error: any) {
            console.error('❌ Deployment failed:', error.message);
        }
    });

program.parse();
