#!/usr/bin/env node

/**
 * Supabase to PostgreSQL Migration Script
 * Exports all data from Supabase and imports to local PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// PostgreSQL configuration
const PG_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'vectabase',
  user: process.env.DB_USER || 'vectabase_admin',
  password: process.env.DB_PASSWORD
};

// Tables to migrate (in order to respect foreign keys)
const TABLES_TO_MIGRATE = [
  // Core tables first (no dependencies)
  { name: 'auth.users', localName: 'users', transform: transformAuthUsers },
  
  // Tables depending on users
  { name: 'profiles', localName: 'profiles', transform: transformProfiles },
  { name: 'stores', localName: 'stores' },
  { name: 'products', localName: 'products' },
  { name: 'sales', localName: 'sales' },
  { name: 'payment_transactions', localName: 'payment_transactions' },
  
  // Whitelist system
  { name: 'whitelist_systems', localName: 'whitelist_systems' },
  { name: 'whitelist_users', localName: 'whitelist_users' },
  { name: 'api_keys', localName: 'api_keys' },
  
  // Bot tables
  { name: 'discord_servers', localName: 'discord_servers' },
  { name: 'bot_products', localName: 'bot_products' },
  { name: 'bot_whitelisted_users', localName: 'bot_whitelisted_users' },
  { name: 'bot_command_permissions', localName: 'bot_command_permissions' },
  
  // Developer API tables
  { name: 'developer_api_keys', localName: 'developer_api_keys' },
  { name: 'developer_subscriptions', localName: 'developer_subscriptions' },
  { name: 'obfuscation_credits', localName: 'obfuscation_credits' },
  { name: 'obfuscation_usage', localName: 'obfuscation_usage' },
  { name: 'developer_products', localName: 'developer_products' },
  { name: 'whitelist_entries', localName: 'whitelist_entries' },
  { name: 'api_request_logs', localName: 'api_request_logs' },
  
  // Additional tables
  { name: 'follows', localName: 'follows' },
  { name: 'announcements', localName: 'announcements' },
  { name: 'collections', localName: 'collections' },
  { name: 'collection_products', localName: 'collection_products' },
  { name: 'newsletter_subscribers', localName: 'newsletter_subscribers' },
  { name: 'store_customizations', localName: 'store_customizations' }
];

// Migration state for checkpoint/resume
const CHECKPOINT_FILE = path.join(__dirname, '../data/migration-checkpoint.json');
const EXPORT_DIR = path.join(__dirname, '../data/migration-export');

/**
 * Transform auth.users to local users table format
 */
function transformAuthUsers(row) {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.encrypted_password || '$2b$12$placeholder', // Will need password reset
    email_verified: row.email_confirmed_at !== null,
    discord_id: row.raw_user_meta_data?.discord_id || null,
    discord_username: row.raw_user_meta_data?.discord_username || null,
    discord_avatar: row.raw_user_meta_data?.avatar_url || null,
    discord_refresh_token: null, // Will need re-auth
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_sign_in_at
  };
}

/**
 * Transform profiles to use user_id instead of auth.users reference
 */
function transformProfiles(row) {
  return {
    ...row,
    user_id: row.user_id // Keep same UUID
  };
}

/**
 * Export data from Supabase
 */
async function exportFromSupabase(supabase) {
  console.log('\n📤 Exporting data from Supabase...\n');
  
  // Ensure export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  
  const exportResults = {};
  
  for (const table of TABLES_TO_MIGRATE) {
    try {
      console.log(`  Exporting ${table.name}...`);
      
      let data = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      // Handle auth.users specially
      if (table.name === 'auth.users') {
        // Use admin API to get users
        const { data: users, error } = await supabase.auth.admin.listUsers({
          perPage: 1000
        });
        
        if (error) {
          console.warn(`    ⚠️ Could not export auth.users: ${error.message}`);
          exportResults[table.name] = { count: 0, error: error.message };
          continue;
        }
        
        data = users.users || [];
      } else {
        // Regular table export with pagination
        while (hasMore) {
          const { data: pageData, error } = await supabase
            .from(table.name)
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (error) {
            console.warn(`    ⚠️ Could not export ${table.name}: ${error.message}`);
            exportResults[table.name] = { count: 0, error: error.message };
            hasMore = false;
            continue;
          }
          
          if (pageData && pageData.length > 0) {
            data = data.concat(pageData);
            page++;
            hasMore = pageData.length === pageSize;
          } else {
            hasMore = false;
          }
        }
      }
      
      // Apply transformation if defined
      if (table.transform && data.length > 0) {
        data = data.map(table.transform);
      }
      
      // Save to file
      const exportPath = path.join(EXPORT_DIR, `${table.localName}.json`);
      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
      
      exportResults[table.name] = { count: data.length };
      console.log(`    ✅ Exported ${data.length} rows`);
      
    } catch (error) {
      console.error(`    ❌ Error exporting ${table.name}:`, error.message);
      exportResults[table.name] = { count: 0, error: error.message };
    }
  }
  
  return exportResults;
}

/**
 * Import data to PostgreSQL
 */
async function importToPostgres(pgClient) {
  console.log('\n📥 Importing data to PostgreSQL...\n');
  
  const importResults = {};
  
  for (const table of TABLES_TO_MIGRATE) {
    const exportPath = path.join(EXPORT_DIR, `${table.localName}.json`);
    
    if (!fs.existsSync(exportPath)) {
      console.log(`  Skipping ${table.localName} (no export file)`);
      importResults[table.localName] = { count: 0, skipped: true };
      continue;
    }
    
    try {
      console.log(`  Importing ${table.localName}...`);
      
      const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      
      if (data.length === 0) {
        console.log(`    ⏭️ No data to import`);
        importResults[table.localName] = { count: 0 };
        continue;
      }
      
      // Get column names from first row
      const columns = Object.keys(data[0]);
      
      // Build insert query
      let imported = 0;
      
      for (const row of data) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table.localName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        try {
          await pgClient.query(query, values);
          imported++;
        } catch (err) {
          // Log but continue on individual row errors
          if (process.env.DEBUG) {
            console.warn(`    Row error: ${err.message}`);
          }
        }
      }
      
      importResults[table.localName] = { count: imported, total: data.length };
      console.log(`    ✅ Imported ${imported}/${data.length} rows`);
      
    } catch (error) {
      console.error(`    ❌ Error importing ${table.localName}:`, error.message);
      importResults[table.localName] = { count: 0, error: error.message };
    }
  }
  
  return importResults;
}

/**
 * Verify migration by comparing row counts
 */
async function verifyMigration(supabase, pgClient) {
  console.log('\n🔍 Verifying migration...\n');
  
  const verification = {};
  let allMatch = true;
  
  for (const table of TABLES_TO_MIGRATE) {
    try {
      // Get PostgreSQL count
      const pgResult = await pgClient.query(`SELECT COUNT(*) FROM ${table.localName}`);
      const pgCount = parseInt(pgResult.rows[0].count, 10);
      
      // Get export file count
      const exportPath = path.join(EXPORT_DIR, `${table.localName}.json`);
      let exportCount = 0;
      if (fs.existsSync(exportPath)) {
        const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        exportCount = data.length;
      }
      
      const match = pgCount >= exportCount * 0.95; // Allow 5% tolerance for conflicts
      verification[table.localName] = {
        exported: exportCount,
        imported: pgCount,
        match
      };
      
      if (!match) {
        allMatch = false;
        console.log(`  ⚠️ ${table.localName}: ${pgCount}/${exportCount} rows`);
      } else {
        console.log(`  ✅ ${table.localName}: ${pgCount} rows`);
      }
      
    } catch (error) {
      verification[table.localName] = { error: error.message };
      console.log(`  ❌ ${table.localName}: ${error.message}`);
      allMatch = false;
    }
  }
  
  return { verification, allMatch };
}

/**
 * Generate migration report
 */
function generateReport(exportResults, importResults, verification) {
  const report = {
    timestamp: new Date().toISOString(),
    exportResults,
    importResults,
    verification,
    summary: {
      tablesExported: Object.keys(exportResults).length,
      tablesImported: Object.keys(importResults).length,
      totalRowsExported: Object.values(exportResults).reduce((sum, r) => sum + (r.count || 0), 0),
      totalRowsImported: Object.values(importResults).reduce((sum, r) => sum + (r.count || 0), 0),
      success: verification.allMatch
    }
  };
  
  const reportPath = path.join(__dirname, '../data/migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Migration Report');
  console.log('==================');
  console.log(`Tables exported: ${report.summary.tablesExported}`);
  console.log(`Tables imported: ${report.summary.tablesImported}`);
  console.log(`Total rows exported: ${report.summary.totalRowsExported}`);
  console.log(`Total rows imported: ${report.summary.totalRowsImported}`);
  console.log(`Status: ${report.summary.success ? '✅ SUCCESS' : '⚠️ PARTIAL'}`);
  console.log(`\nFull report saved to: ${reportPath}`);
  
  return report;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Supabase to PostgreSQL Migration\n');
  console.log('============================================\n');
  
  // Validate configuration
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
    console.error('   Get it from: https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/settings/api');
    process.exit(1);
  }
  
  if (!PG_CONFIG.password) {
    console.error('❌ DB_PASSWORD environment variable is required');
    process.exit(1);
  }
  
  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
  
  const pgClient = new pg.Client(PG_CONFIG);
  
  try {
    // Connect to PostgreSQL
    console.log('🔌 Connecting to PostgreSQL...');
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL\n');
    
    // Export from Supabase
    const exportResults = await exportFromSupabase(supabase);
    
    // Import to PostgreSQL
    const importResults = await importToPostgres(pgClient);
    
    // Verify migration
    const verification = await verifyMigration(supabase, pgClient);
    
    // Generate report
    generateReport(exportResults, importResults, verification);
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

// Run migration
migrate();
