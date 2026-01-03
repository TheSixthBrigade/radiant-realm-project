import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('Checking profiles with Stripe accounts...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, stripe_account_id, stripe_onboarding_status');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('All profiles:');
    data.forEach(p => {
      console.log(`  - user_id=${p.user_id}: stripe_account_id=${p.stripe_account_id}, status=${p.stripe_onboarding_status}`);
    });
  }
}

checkStatus();
