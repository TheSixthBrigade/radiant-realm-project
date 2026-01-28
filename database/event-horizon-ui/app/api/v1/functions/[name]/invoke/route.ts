
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import vm from 'vm';
import { decrypt, deriveProjectKey } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    console.log(`[Invoke] Execution started for function: ${name}`);

    // Verify Access (Project Key required)
    const auth = await verifyAccess(req);
    console.log('[Invoke] Auth result:', auth.authorized, 'Project:', auth.projectId);
    if (!auth.authorized || !auth.projectId) {
        return NextResponse.json({ error: 'Unauthorized. Project API Key required.' }, { status: 401 });
    }

    const logs: any[] = [];
    try {
        // 1. Fetch Function & Files
        console.log('[Invoke] Querying function meta...');
        const funcResult = await query(
            'SELECT id FROM edge_functions WHERE project_id = $1 AND slug = $2',
            [auth.projectId, name]
        );

        if (funcResult.rows.length === 0) {
            console.log('[Invoke] Function not found in DB');
            return NextResponse.json({ error: 'Function not found' }, { status: 404 });
        }

        const funcId = funcResult.rows[0].id;
        console.log('[Invoke] ID found:', funcId);
        const filesResult = await query('SELECT path, content FROM edge_function_files WHERE function_id = $1', [funcId]);
        const files = filesResult.rows;
        console.log(`[Invoke] Loaded ${files.length} files.`);

        // Find entry point: Prefer index.*, but fallback to first file if only one exists
        let entryPoint = files.find((f: any) => f.path === 'index.js' || f.path === 'index.ts' || f.path === 'index.tsx');
        if (!entryPoint && files.length === 1) {
            entryPoint = files[0];
        }

        if (!entryPoint) {
            console.log('[Invoke] Entry point not found');
            return NextResponse.json({ error: 'Entry point not found. Please ensure you have an index.js/ts or only one file deployed.' }, { status: 400 });
        }

        // 2. Fetch Secrets from Vault
        console.log('[Invoke] Querying secrets...');
        const projectRes = await query('SELECT encryption_salt FROM projects WHERE id = $1', [auth.projectId]);
        const salt = projectRes.rows[0]?.encryption_salt || 'default-salt';
        const projectKey = deriveProjectKey(salt);

        const secretsResult = await query('SELECT name, value FROM vault_secrets WHERE project_id = $1', [auth.projectId]);
        const secrets: { [key: string]: string } = {};
        secretsResult.rows.forEach(row => {
            try {
                secrets[row.name] = decrypt(row.value, projectKey);
            } catch (e) {
                logs.push(`ERROR: Failed to decrypt secret "${row.name}"`);
            }
        });
        console.log(`[Invoke] Decrypted ${Object.keys(secrets).length} secrets.`);

        // 3. Parse Body
        console.log('[Invoke] Parsing request body...');
        let body = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch { /* ignore */ }

        // 4. Prepare Sandbox
        console.log('[Invoke] Preparing sandbox...');
        const sandbox: any = {
            event: {
                body,
                headers: Object.fromEntries(req.headers),
                method: req.method
            },
            console: {
                log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
                error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '))
            },
            // DB Helper (Simulated connection)
            db: {
                query: async (sql: string, params: any[] = []) => {
                    const schema = `p${auth.projectId}`;
                    // Set search path for isolation
                    logs.push(`SQL Isolation: Setting search_path to ${schema}`);
                    await query(`SET search_path TO ${schema}, public`);

                    logs.push(`SQL Execute: ${sql} [${params.join(', ')}]`);
                    const result = await query(sql, params);
                    return result.rows;
                }
            },
            // Inject Secrets
            secrets,
            // Simple VFS require
            require: (modulePath: string) => {
                const cleanPath = modulePath.replace(/^\.\//, '');
                const file = files.find(f => f.path === cleanPath || f.path === cleanPath + '.js' || f.path === cleanPath + '.ts');
                if (!file) throw new Error(`Module not found: ${modulePath}`);
                if (file.path.endsWith('.json')) return JSON.parse(file.content);
                return file.content;
            }
        };

        // 5. Execute
        console.log('[Invoke] Starting VM execution...');
        const script = `
            (async () => {
                const { event, console, db, require, secrets } = this;
                ${entryPoint.content}
            })()
        `;

        // Execution with rigid timeout to prevent handler hang
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Execution timed out after 2000ms')), 2000)
        );

        const executionResult = await Promise.race([
            vm.runInNewContext(script, sandbox, { timeout: 2000 }),
            timeoutPromise
        ]);

        console.log('[Invoke] Execution finished successfully.');

        return NextResponse.json({
            result: executionResult,
            logs
        });

    } catch (e: any) {
        console.error('[Invoke] ERROR:', e.message);
        return NextResponse.json({ error: 'Execution Failed', details: e.message, logs }, { status: 500 });
    }
}
