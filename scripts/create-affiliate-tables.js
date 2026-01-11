import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAffiliateTables() {
  console.log('Creating affiliate tables...');
  
  // We need to use the service role key for DDL operations
  // Since we only have anon key, we'll use RPC or direct table operations
  
  // Test if tables exist by trying to select from them
  const { data: settingsTest, error: settingsError } = await supabase
    .from('affiliate_settings')
    .select('*')
    .limit(1);
  
  if (settingsError && settingsError.code === '42P01') {
    console.log('Tables do not exist. Please run the SQL manually in Supabase Dashboard.');
    console.log('\nGo to: https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
    console.log('\nPaste the contents of: database/create-affiliate-tables.sql');
    return;
  }
  
  if (settingsError && settingsError.code === 'PGRST116') {
    console.log('Table exists but is empty - this is fine!');
  } else if (settingsError) {
    console.log('Error checking tables:', settingsError.message);
    console.log('Error code:', settingsError.code);
  } else {
    console.log('affiliate_settings table exists!');
  }
  
  // Check affiliate_links
  const { error: linksError } = await supabase
    .from('affiliate_links')
    .select('*')
    .limit(1);
  
  if (linksError) {
    console.log('affiliate_links error:', linksError.message, linksError.code);
  } else {
    console.log('affiliate_links table exists!');
  }
  
  console.log('\n--- INSTRUCTIONS ---');
  console.log('If tables do not exist, run this SQL in Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
  console.log('\nSQL file: database/create-affiliate-tables.sql');
}

createAffiliateTables();
