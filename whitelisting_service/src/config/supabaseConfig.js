import { createClient } from '@supabase/supabase-js';
// If the above fails in your ESM environment, use:
// import { createClient } from '@supabase/supabase-js/dist/main/index.js';

/**
 * Supabase Configuration Service
 * Fetches all bot configuration from Supabase instead of .env files
 * This is more secure and easier to manage on VPS
 */

// These are the only hardcoded values - they're public anyway
const SUPABASE_URL = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

// Create Supabase client with anon key (no .env needed!)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache for config values
let configCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT = 10000; // 10 second timeout

/**
 * Helper to add timeout to a promise
 */
function withTimeout(promise, ms, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Fetch all configuration from Supabase
 */
export async function fetchConfig() {
  // Return cached config if still valid
  if (configCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    console.log('📦 Using cached config');
    return configCache;
  }

  try {
    console.log('🔄 Fetching config from Supabase...');

    const { data, error } = await withTimeout(
      supabase.from('bot_config').select('key, value'),
      FETCH_TIMEOUT,
      'Supabase config fetch timed out after 10 seconds'
    );

    if (error) {
      console.error('Failed to fetch config from Supabase:', error.message);
      // Return cached config if available, even if stale
      if (configCache) {
        console.warn('⚠️ Using stale cached config');
        return configCache;
      }
      throw error;
    }

    // Convert array to object
    const config = {};
    for (const row of data) {
      config[row.key] = row.value;
    }

    // Update cache
    configCache = config;
    cacheTimestamp = Date.now();

    console.log(`✅ Loaded ${Object.keys(config).length} config values`);
    return config;
  } catch (error) {
    console.error('❌ Error fetching config:', error.message);

    // Return cached config if available
    if (configCache) {
      console.warn('⚠️ Using stale cached config due to error');
      return configCache;
    }

    throw error;
  }
}

/**
 * Get a single config value
 */
export async function getConfigValue(key) {
  const config = await fetchConfig();
  return config[key];
}

/**
 * Get multiple config values
 */
export async function getConfigValues(keys) {
  const config = await fetchConfig();
  const result = {};
  for (const key of keys) {
    result[key] = config[key];
  }
  return result;
}

/**
 * Update a config value in Supabase
 */
export async function setConfigValue(key, value, description = null) {
  const { error } = await supabase
    .from('bot_config')
    .upsert({
      key,
      value,
      description,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error('Failed to update config:', error.message);
    throw error;
  }

  // Invalidate cache
  configCache = null;
  cacheTimestamp = null;
}

/**
 * Get Supabase client for database operations
 */
export function getSupabaseClient() {
  return supabase;
}

/**
 * Get Supabase URL (for anon client creation)
 */
export function getSupabaseUrl() {
  return SUPABASE_URL;
}

export default {
  fetchConfig,
  getConfigValue,
  getConfigValues,
  setConfigValue,
  getSupabaseClient,
  getSupabaseUrl
};
