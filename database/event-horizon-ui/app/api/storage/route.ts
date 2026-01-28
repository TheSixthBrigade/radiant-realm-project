import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jwtVerify } from 'jose';
import { encrypt, decrypt, generateEncryptionKey, sha256 } from '@/lib/crypto';
import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

async function verifyAccess(req: NextRequest, projectId?: string) {
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return { authorized: false };
    try {
        const secret = new TextEncoder().encode(process.env.DB_PASSWORD || 'postgres');
        const { payload } = await jwtVerify(token, secret);
        if (payload.email === 'thecheesemanatyou@gmail.com' || payload.email === 'maxedwardcheetham@gmail.com') {
            const userRes = await query('SELECT id FROM users WHERE email = $1', [payload.email]);
            return { authorized: true, userId: userRes.rows[0]?.id };
        }
        return { authorized: true };
    } catch {
        return { authorized: false };
    }
}

// Ensure storage tables exist
async function ensureStorageTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS storage_buckets (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            public BOOLEAN DEFAULT false,
            file_size_limit BIGINT,
            allowed_mime_types TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, name)
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS storage_objects (
            id SERIAL PRIMARY KEY,
            bucket_id INTEGER REFERENCES storage_buckets(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            size BIGINT NOT NULL,
            mime_type TEXT,
            encryption_key_hash TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(bucket_id, path)
        )
    `);
}

// GET: List buckets or objects
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const bucketName = searchParams.get('bucket');
    const pathPrefix = searchParams.get('path') || '';

    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const { authorized } = await verifyAccess(req, projectId);
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await ensureStorageTables();

        if (!bucketName) {
            // List buckets
            const result = await query(`
                SELECT 
                    b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types, b.created_at,
                    COUNT(o.id) as object_count,
                    COALESCE(SUM(o.size), 0) as total_size
                FROM storage_buckets b
                LEFT JOIN storage_objects o ON o.bucket_id = b.id
                WHERE b.project_id = $1
                GROUP BY b.id
                ORDER BY b.name
            `, [projectId]);
            return NextResponse.json({ type: 'buckets', data: result.rows });
        } else {
            // List objects in bucket
            const bucketResult = await query(
                'SELECT id FROM storage_buckets WHERE project_id = $1 AND name = $2',
                [projectId, bucketName]
            );
            if (bucketResult.rows.length === 0) {
                return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
            }
            const bucketId = bucketResult.rows[0].id;

            const result = await query(`
                SELECT id, name, path, size, mime_type, metadata, created_at, updated_at
                FROM storage_objects
                WHERE bucket_id = $1 AND path LIKE $2
                ORDER BY path
            `, [bucketId, `${pathPrefix}%`]);
            return NextResponse.json({ type: 'objects', bucket: bucketName, data: result.rows });
        }
    } catch (error: any) {
        console.error('Storage fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create bucket or upload object
export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            // Create bucket
            const { projectId, bucketName, isPublic = false, fileSizeLimit, allowedMimeTypes } = await req.json();

            if (!projectId || !bucketName) {
                return NextResponse.json({ error: 'Project ID and bucket name are required' }, { status: 400 });
            }

            const { authorized } = await verifyAccess(req, projectId);
            if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            await ensureStorageTables();

            // Create bucket directory
            const bucketPath = path.join(STORAGE_DIR, projectId.toString(), bucketName);
            await fs.mkdir(bucketPath, { recursive: true });

            await query(`
                INSERT INTO storage_buckets (project_id, name, public, file_size_limit, allowed_mime_types)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (project_id, name) DO UPDATE
                SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types
                RETURNING *
            `, [projectId, bucketName, isPublic, fileSizeLimit || null, allowedMimeTypes || null]);

            return NextResponse.json({ success: true, message: `Bucket "${bucketName}" created` });
        } else {
            // File upload (multipart)
            const formData = await req.formData();
            const file = formData.get('file') as File;
            const projectId = formData.get('projectId') as string;
            const bucketName = formData.get('bucket') as string;
            const filePath = formData.get('path') as string || file.name;

            if (!file || !projectId || !bucketName) {
                return NextResponse.json({ error: 'File, projectId, and bucket are required' }, { status: 400 });
            }

            const { authorized } = await verifyAccess(req, projectId);
            if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

            await ensureStorageTables();

            // Get bucket
            const bucketResult = await query(
                'SELECT id, file_size_limit FROM storage_buckets WHERE project_id = $1 AND name = $2',
                [projectId, bucketName]
            );
            if (bucketResult.rows.length === 0) {
                return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
            }
            const bucket = bucketResult.rows[0];

            // Check file size limit
            if (bucket.file_size_limit && file.size > bucket.file_size_limit) {
                return NextResponse.json({ error: 'File exceeds size limit' }, { status: 400 });
            }

            // Encrypt and save file
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const encryptionKey = generateEncryptionKey();
            const encryptedData = encrypt(fileBuffer.toString('base64'), encryptionKey);

            const storagePath = path.join(STORAGE_DIR, projectId, bucketName, filePath);
            await fs.mkdir(path.dirname(storagePath), { recursive: true });
            await fs.writeFile(storagePath, encryptedData);

            // Store metadata in DB
            await query(`
                INSERT INTO storage_objects (bucket_id, name, path, size, mime_type, encryption_key_hash, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (bucket_id, path) DO UPDATE
                SET size = EXCLUDED.size, mime_type = EXCLUDED.mime_type, updated_at = NOW()
                RETURNING *
            `, [bucket.id, file.name, filePath, file.size, file.type, sha256(encryptionKey), { originalName: file.name }]);

            return NextResponse.json({
                success: true,
                path: filePath,
                size: file.size,
                encrypted: true
            });
        }
    } catch (error: any) {
        console.error('Storage upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete bucket or object
export async function DELETE(req: NextRequest) {
    try {
        const { projectId, bucketName, objectPath } = await req.json();

        if (!projectId || !bucketName) {
            return NextResponse.json({ error: 'Project ID and bucket name are required' }, { status: 400 });
        }

        const { authorized } = await verifyAccess(req, projectId);
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureStorageTables();

        if (objectPath) {
            // Delete object
            const bucketResult = await query(
                'SELECT id FROM storage_buckets WHERE project_id = $1 AND name = $2',
                [projectId, bucketName]
            );
            if (bucketResult.rows.length === 0) {
                return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
            }

            await query('DELETE FROM storage_objects WHERE bucket_id = $1 AND path = $2', [bucketResult.rows[0].id, objectPath]);

            const storagePath = path.join(STORAGE_DIR, projectId.toString(), bucketName, objectPath);
            try {
                await fs.unlink(storagePath);
            } catch { }

            return NextResponse.json({ success: true, message: `Object "${objectPath}" deleted` });
        } else {
            // Delete bucket
            await query('DELETE FROM storage_buckets WHERE project_id = $1 AND name = $2', [projectId, bucketName]);

            const bucketPath = path.join(STORAGE_DIR, projectId.toString(), bucketName);
            try {
                await fs.rm(bucketPath, { recursive: true });
            } catch { }

            return NextResponse.json({ success: true, message: `Bucket "${bucketName}" deleted` });
        }
    } catch (error: any) {
        console.error('Storage delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
