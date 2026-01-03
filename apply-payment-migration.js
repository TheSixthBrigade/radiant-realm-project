import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

async function applyMigration() {
  try {
    console.log('📖 Reading migration file...');
    const sql = readFileSync('./add-preferred-payment-method.sql', 'utf8');
    
    console.log('🔗 Connecting to Supabase...');
    console.log('URL:', SUPABASE_URL);
    
    // Try to execute via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ API Error:', error);
      console.log('\n📋 MANUAL STEPS REQUIRED:');
      console.log('1. Go to https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
      console.log('2. Copy and paste this SQL:');
      console.log('\n' + sql);
      console.log('\n3. Click "Run" or press Ctrl+Enter');
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully!', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
    console.log('2. Copy the SQL from: add-preferred-payment-method.sql');
    console.log('3. Paste it into the SQL Editor');
    console.log('4. Click "Run" or press Ctrl+Enter');
  }
}

applyMigration();
