import SecureDatabaseService from '../services/database.js';
import SupabaseDatabaseService from '../services/supabaseDatabase.js';
import PostgresDatabaseService from '../services/postgresDatabase.js';
import { fetchConfig } from './supabaseConfig.js';

/**
 * Database configuration with enterprise security settings
 * ALL config is loaded from Supabase - NO .env file needed!
 */

// Cache for config
let cachedConfig = null;

async function getConfig() {
  if (!cachedConfig) {
    cachedConfig = await fetchConfig();
  }
  return cachedConfig;
}

/**
 * Initialize and return configured database instance
 * Uses Supabase by default (no .env needed!)
 */
export async function initializeDatabase() {
  const config = await getConfig();
  const dbType = config.DATABASE_TYPE || 'supabase';
  
  // Supabase URL and key are hardcoded in supabaseConfig.js (they're public anyway)
  const SUPABASE_URL = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';
  
  if (dbType === 'postgres') {
    console.log('🐘 Using PostgreSQL database...');
    const db = new PostgresDatabaseService({
      host: config.DB_HOST || 'localhost',
      port: config.DB_PORT || 5432,
      database: config.DB_NAME || 'vectabase',
      user: config.DB_USER || 'vectabase_admin',
      password: config.DB_PASSWORD,
      encryptionKey: config.DB_ENCRYPTION_KEY
    });
    await db.initializeDatabase();
    return db;
  } else if (dbType === 'supabase') {
    console.log('🌐 Using Supabase database (no .env needed!)...');
    const db = new SupabaseDatabaseService({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
      encryptionKey: config.DB_ENCRYPTION_KEY
    });
    await db.initializeDatabase();
    return db;
  } else {
    console.log('📁 Using local JSON database...');
    const db = new SecureDatabaseService({
      databasePath: config.DATABASE_PATH || './data/whitelist.json',
      backupPath: config.BACKUP_PATH || './data/backups/',
      encryptionKey: config.DB_ENCRYPTION_KEY
    });
    await db.initializeDatabase();
    return db;
  }
}

/**
 * Validate database configuration
 */
export async function validateDatabaseConfig() {
  const config = await getConfig();
  const errors = [];
  const dbType = config.DATABASE_TYPE || 'supabase';
  
  if (dbType === 'postgres') {
    if (!config.DB_PASSWORD) {
      errors.push('DB_PASSWORD is required for PostgreSQL database');
    }
    if (!config.DB_ENCRYPTION_KEY) {
      errors.push('DB_ENCRYPTION_KEY is required for encryption');
    }
  } else if (dbType === 'supabase') {
    // Supabase URL and key are hardcoded - no validation needed
    // Encryption key is optional for Supabase
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export config getter for other modules
export { getConfig };

export default { initializeDatabase, validateDatabaseConfig, getConfig };