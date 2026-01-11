import SecureDatabaseService from '../services/database.js';
import SupabaseDatabaseService from '../services/supabaseDatabase.js';
import PostgresDatabaseService from '../services/postgresDatabase.js';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Database configuration with enterprise security settings
 * Supports: 'postgres' (recommended), 'supabase', or 'local' (JSON file)
 */
const databaseConfig = {
  // Database type: 'postgres', 'supabase' (default for now), or 'local'
  databaseType: process.env.DATABASE_TYPE || 'supabase',
  
  // PostgreSQL configuration
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vectabase',
    user: process.env.DB_USER || 'vectabase_admin',
    password: process.env.DB_PASSWORD
  },
  
  // Supabase configuration (legacy)
  supabaseUrl: process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg',
  
  // Local database file path (fallback)
  databasePath: process.env.DATABASE_PATH || './data/whitelist.json',
  
  // Backup configuration
  backupPath: process.env.BACKUP_PATH || './data/backups/',
  
  // Encryption key
  encryptionKey: process.env.DB_ENCRYPTION_KEY,
  
  // Security settings
  security: {
    saltRounds: 12,
    maxRetries: 5,
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
 * Uses PostgreSQL by default, supports Supabase and local JSON as fallbacks
 */
export async function initializeDatabase() {
  const dbType = databaseConfig.databaseType;
  
  if (dbType === 'postgres') {
    console.log('🐘 Using PostgreSQL database...');
    const db = new PostgresDatabaseService({
      ...databaseConfig.postgres,
      encryptionKey: databaseConfig.encryptionKey
    });
    await db.initializeDatabase();
    return db;
  } else if (dbType === 'supabase') {
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
  const dbType = databaseConfig.databaseType;
  
  if (dbType === 'postgres') {
    // PostgreSQL validation
    if (!databaseConfig.postgres.password && !process.env.DB_PASSWORD) {
      errors.push('DB_PASSWORD is required for PostgreSQL database');
    }
    if (!process.env.DB_ENCRYPTION_KEY) {
      errors.push('DB_ENCRYPTION_KEY environment variable is required for encryption');
    }
    if (process.env.DB_ENCRYPTION_KEY && process.env.DB_ENCRYPTION_KEY.length < 64) {
      errors.push('DB_ENCRYPTION_KEY must be 64 characters (32 bytes hex) for AES-256');
    }
  } else if (dbType === 'supabase') {
    // Supabase validation
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