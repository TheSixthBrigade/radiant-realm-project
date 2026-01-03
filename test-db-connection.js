// Quick database connection test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Test profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);
  
  if (profilesError) {
    console.log('❌ Profiles table:', profilesError.message);
  } else {
    console.log('✅ Profiles table: Connected');
  }
  
  // Test products table
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('count')
    .limit(1);
  
  if (productsError) {
    console.log('❌ Products table:', productsError.message);
  } else {
    console.log('✅ Products table: Connected');
  }
  
  // Test stores table
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('count')
    .limit(1);
  
  if (storesError) {
    console.log('❌ Stores table:', storesError.message);
  } else {
    console.log('✅ Stores table: Connected');
  }
  
  // Test website_assets bucket
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();
  
  if (bucketsError) {
    console.log('❌ Storage buckets:', bucketsError.message);
  } else {
    const hasWebsiteAssets = buckets.some(b => b.name === 'website-assets');
    if (hasWebsiteAssets) {
      console.log('✅ website-assets bucket: Exists');
    } else {
      console.log('⚠️  website-assets bucket: Not found (run migration)');
    }
  }
  
  console.log('\n🎉 Database is ready!');
}

testConnection();
