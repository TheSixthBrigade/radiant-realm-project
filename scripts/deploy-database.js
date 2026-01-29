/**
 * Database Deployment Script
 * Exports local database and prepares for VPS deployment
 * 
 * Usage:
 *   node scripts/deploy-database.js export    - Export local DB to SQL file
 *   node scripts/deploy-database.js import    - Import SQL file to database
 *   node scripts/deploy-database.js sync      - Full sync (schema + data)
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const { Pool } = pg;

const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups');
const SEED_FILE = path.join(__dirname, '..', 'database', 'seed-data.sql');

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (e) {}
}

async function exportDatabase() {
  console.log('📦 Exporting database...\n');
  
  await ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vectabase',
    user: process.env.DB_USER || 'vectabase_admin',
    password: process.env.DB_PASSWORD,
  };
  
  // Set PGPASSWORD for pg_dump
  process.env.PGPASSWORD = dbConfig.password;
  
  try {
    // Export schema and data
    const cmd = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --no-owner --no-acl -f "${backupFile}"`;
    
    console.log('Running pg_dump...');
    execSync(cmd, { stdio: 'inherit' });
    
    console.log(`\n✅ Database exported to: ${backupFile}`);
    
    // Also create a "latest" symlink/copy
    const latestFile = path.join(BACKUP_DIR, 'latest.sql');
    await fs.copyFile(backupFile, latestFile);
    console.log(`✅ Latest backup: ${latestFile}`);
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.log('\nMake sure pg_dump is installed and in your PATH');
    process.exit(1);
  }
}

async function importDatabase(sqlFile) {
  console.log('📥 Importing database...\n');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vectabase',
    user: process.env.DB_USER || 'vectabase_admin',
    password: process.env.DB_PASSWORD,
  };
  
  const pool = new Pool(dbConfig);
  
  try {
    // Read SQL file
    const fileToImport = sqlFile || path.join(BACKUP_DIR, 'latest.sql');
    console.log(`Reading: ${fileToImport}`);
    
    const sql = await fs.readFile(fileToImport, 'utf8');
    
    const client = await pool.connect();
    console.log('Connected to database...');
    
    // Execute the SQL
    await client.query(sql);
    
    client.release();
    console.log('\n✅ Database imported successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function generateSeedData() {
  console.log('🌱 Generating seed data SQL...\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vectabase',
    user: process.env.DB_USER || 'vectabase_admin',
    password: process.env.DB_PASSWORD,
  });
  
  try {
    const client = await pool.connect();
    
    let seedSql = `-- Vectabase Seed Data
-- Generated: ${new Date().toISOString()}
-- This file contains sample/test data for development

`;
    
    // Export users (without passwords for security - they'll need to reset)
    const { rows: users } = await client.query(`
      SELECT id, email, discord_id, discord_username, created_at 
      FROM users LIMIT 50
    `);
    
    if (users.length > 0) {
      seedSql += `-- Users (passwords excluded for security)\n`;
      for (const user of users) {
        seedSql += `INSERT INTO users (id, email, password_hash, discord_id, discord_username, created_at) 
VALUES ('${user.id}', '${user.email}', '$2b$10$placeholder', ${user.discord_id ? `'${user.discord_id}'` : 'NULL'}, ${user.discord_username ? `'${user.discord_username}'` : 'NULL'}, '${user.created_at.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
      }
      seedSql += '\n';
    }
    
    // Export profiles
    const { rows: profiles } = await client.query(`
      SELECT id, user_id, display_name, bio, is_creator, stripe_connect_status, preferred_payment_method
      FROM profiles LIMIT 50
    `);
    
    if (profiles.length > 0) {
      seedSql += `-- Profiles\n`;
      for (const p of profiles) {
        seedSql += `INSERT INTO profiles (id, user_id, display_name, bio, is_creator, stripe_connect_status, preferred_payment_method)
VALUES ('${p.id}', '${p.user_id}', ${p.display_name ? `'${p.display_name.replace(/'/g, "''")}'` : 'NULL'}, ${p.bio ? `'${p.bio.replace(/'/g, "''")}'` : 'NULL'}, ${p.is_creator}, '${p.stripe_connect_status || 'not_connected'}', '${p.preferred_payment_method || 'stripe'}')
ON CONFLICT (user_id) DO NOTHING;\n`;
      }
      seedSql += '\n';
    }
    
    // Export products
    const { rows: products } = await client.query(`
      SELECT id, user_id, title, description, price, currency, category, is_published, is_free
      FROM products WHERE is_published = true LIMIT 100
    `);
    
    if (products.length > 0) {
      seedSql += `-- Products\n`;
      for (const p of products) {
        seedSql += `INSERT INTO products (id, user_id, title, description, price, currency, category, is_published, is_free)
VALUES ('${p.id}', '${p.user_id}', '${p.title.replace(/'/g, "''")}', ${p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL'}, ${p.price}, '${p.currency}', ${p.category ? `'${p.category}'` : 'NULL'}, ${p.is_published}, ${p.is_free})
ON CONFLICT (id) DO NOTHING;\n`;
      }
      seedSql += '\n';
    }
    
    // Export stores
    const { rows: stores } = await client.query(`
      SELECT id, user_id, store_name, store_slug, is_public
      FROM stores LIMIT 50
    `);
    
    if (stores.length > 0) {
      seedSql += `-- Stores\n`;
      for (const s of stores) {
        seedSql += `INSERT INTO stores (id, user_id, store_name, store_slug, is_public)
VALUES ('${s.id}', '${s.user_id}', '${s.store_name.replace(/'/g, "''")}', ${s.store_slug ? `'${s.store_slug}'` : 'NULL'}, ${s.is_public})
ON CONFLICT (id) DO NOTHING;\n`;
      }
      seedSql += '\n';
    }
    
    client.release();
    
    // Write seed file
    await fs.writeFile(SEED_FILE, seedSql);
    console.log(`✅ Seed data written to: ${SEED_FILE}`);
    
  } catch (error) {
    console.error('❌ Seed generation failed:', error.message);
  } finally {
    await pool.end();
  }
}

async function fullSync() {
  console.log('🔄 Full database sync...\n');
  
  // 1. Export current database
  await exportDatabase();
  
  // 2. Generate seed data
  await generateSeedData();
  
  console.log('\n' + '─'.repeat(50));
  console.log('\n✅ Database sync complete!');
  console.log('\nFiles ready for deployment:');
  console.log('  - database/backups/latest.sql (full backup)');
  console.log('  - database/seed-data.sql (sample data)');
  console.log('  - database/schema.sql (schema only)');
  console.log('\nOn VPS, run: node scripts/apply-migrations.js');
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'export':
    exportDatabase();
    break;
  case 'import':
    importDatabase(process.argv[3]);
    break;
  case 'seed':
    generateSeedData();
    break;
  case 'sync':
    fullSync();
    break;
  default:
    console.log(`
Database Deployment Script

Usage:
  node scripts/deploy-database.js export    Export local DB to SQL file
  node scripts/deploy-database.js import    Import SQL file to database  
  node scripts/deploy-database.js seed      Generate seed data SQL
  node scripts/deploy-database.js sync      Full sync (export + seed)
`);
}
