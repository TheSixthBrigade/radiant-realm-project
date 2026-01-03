import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearStripeAccounts() {
  console.log('Clearing stale Stripe account IDs...');
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      stripe_account_id: null,
      stripe_onboarding_status: 'not_started'
    })
    .not('stripe_account_id', 'is', null);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Cleared Stripe accounts. Users can now reconnect with test mode.');
  }
}

clearStripeAccounts();
