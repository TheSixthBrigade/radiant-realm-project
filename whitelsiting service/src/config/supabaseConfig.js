import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Configuration Service
 * Fetches all bot configuration from Supabase instead of .env files
 * This is more secure and easier to manage on VPS
 */

// These are the only hardcoded values - they're public anyway
const SUPABASE_URL = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

// Service key can be passed via env var if needed for admin operations
// Otherwise we use anon key with a special RLS policy
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

// Cache for config values
let configCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all configuration from Supabase
 */
export async function fetchConfig() {
  // Return cached config if still valid
  if (configCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return configCache;
  }

  try {
    const { data, error } = await supabase
      .from('bot_config')
      .select('key, value');

    if (error) {
      console.error('Failed to fetch config from Supabase:', error.message);
      // Return cached config if available, even if stale
      if (configCache) {
        console.warn('Using stale cached config');
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

    return config;
  } catch (error) {
    console.error('Error fetching config:', error);
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
