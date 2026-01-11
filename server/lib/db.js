/**
 * Database Connection Module
 * Supports both PostgreSQL and Supabase backends
 * Provides connection pooling and query utilities for the Vectabase platform
 */

import { createClient } from '@supabase/supabase-js';

// Determine database type
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'supabase';
const USE_SUPABASE = DATABASE_TYPE === 'supabase';

// Supabase client (lazy initialized)
let supabaseClient = null;

// PostgreSQL pool (lazy initialized)
let pool = null;

/**
 * Get Supabase client
 */
function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when DATABASE_TYPE=supabase');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * PostgreSQL configuration from environment variables
 */
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'vectabase',
  user: process.env.DB_USER || 'vectabase_admin',
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false
};

/**
 * Initialize the PostgreSQL connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
export async function getPool() {
  if (USE_SUPABASE) {
    return null; // Not used with Supabase
  }
  
  if (!pool) {
    const pg = await import('pg');
    const { Pool } = pg.default;
    
    pool = new Pool(pgConfig);
    
    // Log pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
    
    // Log when client is acquired (debug mode only)
    if (process.env.DB_DEBUG === 'true') {
      pool.on('acquire', () => {
        console.log('Database client acquired from pool');
      });
      
      pool.on('release', () => {
        console.log('Database client released to pool');
      });
    }
  }
  
  return pool;
}

/**
 * Execute a query with automatic connection handling
 * Supports both PostgreSQL and Supabase
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<{rows: Array, rowCount: number}>} Query result
 */
export async function query(text, params = []) {
  const start = Date.now();
  
  try {
    let result;
    
    if (USE_SUPABASE) {
      // Use Supabase's rpc or direct query
      const supabase = getSupabase();
      
      // For Supabase, we need to use the REST API or rpc
      // Convert parameterized query to Supabase format
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: text,
        query_params: params
      }).maybeSingle();
      
      if (error) {
        // If rpc doesn't exist, fall back to direct table operations
        // This is a simplified approach - complex queries may need adjustment
        throw new Error(`Supabase query error: ${error.message}`);
      }
      
      result = { rows: Array.isArray(data) ? data : (data ? [data] : []), rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0) };
    } else {
      const pool = await getPool();
      result = await pool.query(text, params);
    }
    
    const duration = Date.now() - start;
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', text.substring(0, 200));
    throw error;
  }
}

/**
 * Execute a query and return the first row
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} First row or null
 */
export async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Array of rows
 */
export async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Get a client from the pool for transaction support
 * @returns {Promise<pg.PoolClient>} Database client
 */
export async function getClient() {
  if (USE_SUPABASE) {
    // Supabase doesn't support traditional transactions via REST API
    // Return a mock client that uses Supabase
    return {
      query: async (text, params) => query(text, params),
      release: () => {}
    };
  }
  
  const pool = await getPool();
  return pool.connect();
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<any>} Result of callback
 */
export async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection health
 * @returns {Promise<{healthy: boolean, latency: number, error?: string}>}
 */
export async function healthCheck() {
  const start = Date.now();
  
  try {
    if (USE_SUPABASE) {
      // Test Supabase connection by querying profiles table
      const supabase = getSupabase();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) throw error;
      
      return {
        healthy: true,
        latency: Date.now() - start,
        type: 'supabase'
      };
    } else {
      const pool = await getPool();
      await pool.query('SELECT 1');
      return {
        healthy: true,
        latency: Date.now() - start,
        type: 'postgresql'
      };
    }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error.message,
      type: USE_SUPABASE ? 'supabase' : 'postgresql'
    };
  }
}

/**
 * Get pool statistics
 * @returns {Object} Pool statistics
 */
export function getPoolStats() {
  if (USE_SUPABASE) {
    return {
      type: 'supabase',
      message: 'Pool stats not available for Supabase'
    };
  }
  
  if (!pool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0
    };
  }
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

/**
 * Close the database pool
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (USE_SUPABASE) {
    supabaseClient = null;
    console.log('Supabase client cleared');
    return;
  }
  
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

/**
 * Get Supabase client for direct table operations
 * @returns {SupabaseClient|null}
 */
export function getSupabaseClient() {
  if (!USE_SUPABASE) return null;
  return getSupabase();
}

/**
 * Check if using Supabase
 * @returns {boolean}
 */
export function isUsingSupabase() {
  return USE_SUPABASE;
}

/**
 * Initialize database schema
 * @returns {Promise<void>}
 */
export async function initializeSchema() {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  
  try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error.message);
    throw error;
  }
}

// Export default object for convenience
export default {
  getPool,
  query,
  queryOne,
  queryAll,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  closePool,
  initializeSchema,
  getSupabaseClient,
  isUsingSupabase
};
