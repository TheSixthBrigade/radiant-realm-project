import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📖 Reading migration file...');
    const sql = readFileSync('./add-preferred-payment-method.sql', 'utf8');
    
    console.log('🔗 Connecting to Supabase...');
    console.log('SQL to execute:');
    console.log(sql);
    
    console.log('\n⚠️  Note: This requires service role key or manual execution.');
    console.log('\n📋 PLEASE RUN THIS SQL MANUALLY:');
    console.log('1. Go to: https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Paste and click "Run"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
