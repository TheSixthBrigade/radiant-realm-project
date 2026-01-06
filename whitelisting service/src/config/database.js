import SecureDatabaseService from '../services/database.js';
import SupabaseDatabaseService from '../services/supabaseDatabase.js';

/**
 * Database configuration with enterprise security settings
 */
const databaseConfig = {
  // Database type: 'supabase' (default) or 'local'
  databaseType: process.env.DATABASE_TYPE || 'supabase',
  
  // Supabase configuration
  supabaseUrl: process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg',
  
  // Local database file path (fallback)
  databasePath: process.env.DATABASE_PATH || './data/whitelist.json',
  
  // Backup configuration
  backupPath: process.env.BACKUP_PATH || './data/backups/',
  
  // Encryption key (for local database)
  encryptionKey: process.env.DB_ENCRYPTION_KEY,
  
  // Security settings
  security: {
    saltRounds: 12,
    maxRetries: 3,
    connectionTimeout: 30000,
    auditLogging: true,
    backupOnClose: true
  },
  
  // Performance settings
  performance: {
    journalMode: 'WAL',
    synchronous: 'FULL',
    tempStore: 'MEMORY',
    cacheSize: 10000
  }
};

/**
 * Initialize and return configured database instance
 * Uses Supabase by default, falls back to local JSON if configured
 */
export async function initializeDatabase() {
  const useSupabase = databaseConfig.databaseType === 'supabase';
  
  if (useSupabase) {
    console.log('🌐 Using Supabase database...');
    const db = new SupabaseDatabaseService({
      supabaseUrl: databaseConfig.supabaseUrl,
      supabaseKey: databaseConfig.supabaseKey,
      encryptionKey: databaseConfig.encryptionKey
    });
    await db.initializeDatabase();
    return db;
  } else {
    console.log('📁 Using local JSON database...');
    const db = new SecureDatabaseService(databaseConfig);
    await db.initializeDatabase();
    return db;
  }
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig() {
  const errors = [];
  const useSupabase = databaseConfig.databaseType === 'supabase';
  
  if (useSupabase) {
    // Supabase validation - URL and key are already set with defaults
    if (!databaseConfig.supabaseUrl) {
      errors.push('SUPABASE_URL is required for Supabase database');
    }
    if (!databaseConfig.supabaseKey) {
      errors.push('SUPABASE_ANON_KEY is required for Supabase database');
    }
  } else {
    // Local database validation
    if (!process.env.DB_ENCRYPTION_KEY) {
      errors.push('DB_ENCRYPTION_KEY environment variable is required for local database encryption');
    }
    
    if (process.env.DB_ENCRYPTION_KEY && process.env.DB_ENCRYPTION_KEY.length < 32) {
      errors.push('DB_ENCRYPTION_KEY must be at least 32 characters long');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default databaseConfig;