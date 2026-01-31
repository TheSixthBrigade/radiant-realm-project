import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAccess } from '@/lib/auth';
import vm from 'vm';
import { decrypt, deriveProjectKey } from '@/lib/crypto';
import crypto from 'crypto';

/**
 * Internal invoke endpoint for UI - uses session auth
 * POST /api/functions/invoke
 * Body: { projectId, functionSlug, payload }
 */
export async function POST(req: NextRequest) {
    const auth = await verifyAccess(req);
    
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { projectId, functionSlug, payload = {} } = body;

    if (!projectId || !functionSlug) {
        return NextResponse.json({ error: 'projectId and functionSlug are required' }, { status: 400 });
    }

    // If session auth, verify user has access to this project
    if (auth.method === 'session' && auth.userId) {
        const accessCheck = await query(`
            SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2
            UNION
            SELECT 1 FROM projects p JOIN organizations o ON p.org_id = o.id WHERE p.id = $1 AND o.owner_id = $2
        `, [projectId, auth.userId]);
        
        if (accessCheck.rows.length === 0 && !auth.isAdmin) {
            return NextResponse.json({ error: 'No access to this project' }, { status: 403 });
        }
    }

    const logs: string[] = [];
    const startTime = Date.now();

    try {
        // Ensure tables exist
        await query(`
            CREATE TABLE IF NOT EXISTS vault_secrets (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                value TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(project_id, name)
            )
        `);

        try {
            await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS encryption_salt TEXT`);
        } catch { /* ignore */ }

        // Fetch function
        const funcResult = await query(
            'SELECT id FROM edge_functions WHERE project_id = $1 AND slug = $2',
            [projectId, functionSlug]
        );

        if (funcResult.rows.length === 0) {
            return NextResponse.json({ error: 'Function not found' }, { status: 404 });
        }

        const funcId = funcResult.rows[0].id;
        const filesResult = await query('SELECT path, content FROM edge_function_files WHERE function_id = $1', [funcId]);
        const files = filesResult.rows;

        // Find entry point
        let entryPoint = files.find((f: any) => f.path === 'index.js' || f.path === 'index.ts' || f.path === 'index.tsx');
        if (!entryPoint && files.length === 1) {
            entryPoint = files[0];
        }

        if (!entryPoint) {
            return NextResponse.json({ 
                error: 'Entry point not found. Ensure you have an index.js/ts file.' 
            }, { status: 400 });
        }

        // Fetch secrets
        let secrets: { [key: string]: string } = {};
        try {
            const projectRes = await query('SELECT encryption_salt FROM projects WHERE id = $1', [projectId]);
            let salt = projectRes.rows[0]?.encryption_salt;
            
            if (!salt) {
                salt = crypto.randomBytes(16).toString('hex');
                await query('UPDATE projects SET encryption_salt = $1 WHERE id = $2', [salt, projectId]);
            }
            
            const projectKey = deriveProjectKey(salt);
            const secretsResult = await query('SELECT name, value FROM vault_secrets WHERE project_id = $1', [projectId]);
            
            secretsResult.rows.forEach((row: any) => {
                try {
                    secrets[row.name] = decrypt(row.value, projectKey);
                } catch {
                    logs.push(`WARN: Failed to decrypt secret "${row.name}"`);
                }
            });
        } catch (e: any) {
            logs.push(`WARN: Could not load secrets: ${e.message}`);
        }

        // Prepare sandbox
        const sandbox: any = {
            event: {
                body: payload,
                headers: {},
                method: 'POST',
                url: `/api/functions/invoke`
            },
            console: {
                log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                warn: (...args: any[]) => logs.push('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                info: (...args: any[]) => logs.push('INFO: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
            },
            db: {
                query: async (sql: string, params: any[] = []) => {
                    const schema = `p${projectId}`;
                    logs.push(`[DB] Schema: ${schema}`);
                    await query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
                    await query(`SET search_path TO ${schema}, public`);
                    logs.push(`[DB] Execute: ${sql.substring(0, 100)}...`);
                    const result = await query(sql, params);
                    return result.rows;
                }
            },
            secrets,
            require: (modulePath: string) => {
                const cleanPath = modulePath.replace(/^\.\//, '');
                const file = files.find((f: any) => 
                    f.path === cleanPath || 
                    f.path === cleanPath + '.js' || 
                    f.path === cleanPath + '.ts'
                );
                if (!file) throw new Error(`Module not found: ${modulePath}`);
                if (file.path.endsWith('.json')) return JSON.parse(file.content);
                return file.content;
            },
            JSON, Math, Date, Array, Object, String, Number, Boolean, Promise,
            setTimeout: (fn: Function, ms: number) => {
                if (ms > 1000) ms = 1000;
                return setTimeout(fn, ms);
            },
            fetch: async (url: string, options?: any) => {
                logs.push(`[Fetch] ${options?.method || 'GET'} ${url}`);
                return fetch(url, options);
            }
        };

        // Execute
        const script = `
            (async () => {
                const { event, console, db, require, secrets, JSON, Math, Date, Array, Object, String, Number, Boolean, Promise, setTimeout, fetch } = this;
                ${entryPoint.content}
            })()
        `;

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Execution timed out after 2000ms')), 2000)
        );

        const executionResult = await Promise.race([
            vm.runInNewContext(script, sandbox, { timeout: 2000 }),
            timeoutPromise
        ]);

        return NextResponse.json({
            result: executionResult,
            logs,
            executionTime: Date.now() - startTime
        });

    } catch (e: any) {
        return NextResponse.json({ 
            error: 'Execution Failed', 
            details: e.message, 
            logs,
            executionTime: Date.now() - startTime
        }, { status: 500 });
    }
}
