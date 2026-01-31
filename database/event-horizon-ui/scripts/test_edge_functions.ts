#!/usr/bin/env npx tsx
/**
 * Edge Functions Test Script
 * Tests the edge function invoke endpoint locally
 * 
 * Usage: npx tsx scripts/test_edge_functions.ts [projectId] [functionSlug]
 */

import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function generateApiKey(prefix: string = 'eh'): string {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${randomPart}`;
}

async function main() {
    const args = process.argv.slice(2);
    const projectId = args[0] || '1';
    const functionSlug = args[1] || 'hello-world';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    console.log('🧪 Edge Functions Test');
    console.log('======================\n');
    console.log(`Project ID: ${projectId}`);
    console.log(`Function:   ${functionSlug}`);
    console.log(`Base URL:   ${baseUrl}\n`);

    try {
        // 1. Check if function exists
        console.log('📋 Checking function exists...');
        const funcResult = await pool.query(
            'SELECT id, name, slug FROM edge_functions WHERE project_id = $1 AND slug = $2',
            [projectId, functionSlug]
        );

        if (funcResult.rows.length === 0) {
            console.error('❌ Function not found!');
            console.log('\n💡 Create a function first:');
            console.log('   1. Run: npx tsx scripts/setup_local_db.ts');
            console.log('   2. Or create via the UI at http://localhost:3000');
            process.exit(1);
        }

        const func = funcResult.rows[0];
        console.log(`✅ Found: "${func.name}" (ID: ${func.id})\n`);

        // 2. Get or create API key
        console.log('🔑 Getting API key...');
        let apiKey: string;

        const keyResult = await pool.query(
            "SELECT key_hash FROM api_keys WHERE project_id = $1 AND key_type = 'service_role'",
            [projectId]
        );

        if (keyResult.rows.length === 0) {
            // Generate new key
            apiKey = generateApiKey('eh_secret');
            const keyHash = sha256(apiKey);
            const keyPrefix = apiKey.substring(0, 16) + '...';

            await pool.query(`
                INSERT INTO api_keys (project_id, key_type, key_hash, key_prefix)
                VALUES ($1, 'service_role', $2, $3)
            `, [projectId, keyHash, keyPrefix]);

            console.log(`✅ Generated new service_role key: ${apiKey}\n`);
            console.log('⚠️  Save this key! You won\'t see it again.\n');
        } else {
            // Key exists but we don't have the raw value
            // Generate a new one for testing
            apiKey = generateApiKey('eh_secret');
            const keyHash = sha256(apiKey);
            const keyPrefix = apiKey.substring(0, 16) + '...';

            await pool.query(`
                UPDATE api_keys SET key_hash = $1, key_prefix = $2
                WHERE project_id = $3 AND key_type = 'service_role'
            `, [keyHash, keyPrefix, projectId]);

            console.log(`✅ Regenerated service_role key: ${apiKey}\n`);
        }

        // 3. Test the invoke endpoint
        console.log('🚀 Invoking function...');
        const invokeUrl = `${baseUrl}/api/v1/functions/${functionSlug}/invoke`;
        console.log(`   URL: ${invokeUrl}\n`);

        const testPayload = {
            name: 'Test User',
            timestamp: new Date().toISOString(),
            data: { foo: 'bar', count: 42 }
        };

        const response = await fetch(invokeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(testPayload)
        });

        const result = await response.json();

        console.log('📤 Response Status:', response.status);
        console.log('📥 Response Body:');
        console.log(JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\n✅ Test passed! Edge function executed successfully.');
            
            if (result.logs && result.logs.length > 0) {
                console.log('\n📝 Function Logs:');
                result.logs.forEach((log: string, i: number) => {
                    console.log(`   ${i + 1}. ${log}`);
                });
            }

            if (result.executionTime) {
                console.log(`\n⏱️  Execution time: ${result.executionTime}ms`);
            }
        } else {
            console.log('\n❌ Test failed!');
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
        }

    } catch (error: any) {
        console.error('\n❌ Test error:', error.message);
        
        if (error.cause?.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the dev server is running:');
            console.log('   npm run dev');
        }
    } finally {
        await pool.end();
    }
}

main();
