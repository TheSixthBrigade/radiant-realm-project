
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const query = (text: string, params?: any[]) => pool.query(text, params);

async function importFromSupabase(projectId: number, supabaseUrl: string, anonKey: string) {
    console.log(`🚀 Starting Migration from Supabase to Vectabase Project ${projectId}...`);

    // 1. Fetch tables from Supabase
    // Note: This is an oversimplification, in a real app we'd use the PostgREST OpenAPI spec or queries
    console.log(`📡 Introspecting Supabase schema at ${supabaseUrl}...`);

    // For this demo, let's assume we want to sync the 'announcements' table if it exists
    const tablesToSync = ['announcements', 'users', 'posts'];
    const targetSchema = `p${projectId}`;

    for (const table of tablesToSync) {
        try {
            console.log(`📦 Fetching data for table: ${table}...`);
            const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            });

            if (!res.ok) {
                console.log(`⚠️  Skipping ${table}: Not found or access denied.`);
                continue;
            }

            const rows = await res.json();
            if (rows.length === 0) {
                console.log(`ℹ️  Table ${table} is empty.`);
                continue;
            }

            console.log(`📥 Migrating ${rows.length} rows into ${targetSchema}.${table}...`);

            // Ensure table exists in Vectabase schema
            // In a real version, we'd dynamically generate the CREATE TABLE from Supabase meta
            // For now, we reuse the existing p5 structure
            await query(`CREATE SCHEMA IF NOT EXISTS ${targetSchema}`);

            // Simple mapping for this demo
            const columns = Object.keys(rows[0]);
            const colDefinitions = columns.map(c => `"${c}" TEXT`).join(', '); // Simplified mapping

            await query(`CREATE TABLE IF NOT EXISTS ${targetSchema}."${table}" (${colDefinitions})`);

            for (const row of rows) {
                const vals = Object.values(row);
                const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = columns.map(c => `"${c}"`).join(', ');

                await query(`INSERT INTO ${targetSchema}."${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, vals);
            }

            console.log(`✅ Table ${table} migrated successfully.`);
        } catch (e: any) {
            console.error(`❌ Error migrating ${table}:`, e.message);
        }
    }

    console.log(`\n🎉 Migration complete for Project ${projectId}!`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log("Usage: npx tsx scripts/supabase_import.ts [projectId] [supabaseUrl] [anonKey]");
        process.exit(1);
    }

    const projectId = parseInt(args[0]);
    const url = args[1];
    const key = args[2];

    try {
        await importFromSupabase(projectId, url, key);
    } finally {
        await pool.end();
    }
}

main();
