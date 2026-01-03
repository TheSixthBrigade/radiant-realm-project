// Force clear all Stripe accounts using RPC
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceClearStripe() {
  console.log('🔧 Force Clearing All Stripe Accounts\n');

  try {
    // Get all profiles first
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_connect_account_id');

    if (profiles) {
      console.log('Found profiles to clear:');
      for (const profile of profiles) {
        if (profile.stripe_connect_account_id) {
          console.log(`   ${profile.display_name}: ${profile.stripe_connect_account_id}`);
          
          // Clear each one individually
          const { error } = await supabase
            .from('profiles')
            .update({
              stripe_connect_account_id: null,
              stripe_connect_status: null
            })
            .eq('user_id', profile.user_id);

          if (error) {
            console.error(`❌ Error clearing ${profile.display_name}:`, error.message);
          } else {
            console.log(`✅ Cleared ${profile.display_name}`);
          }
        }
      }
    }

    console.log('\n🎯 Now you need to create a test seller account:');
    console.log('1. Go to: https://dashboard.stripe.com/test/connect/accounts/create');
    console.log('2. Create an Express account with test data');
    console.log('3. Copy the account ID (starts with "acct_")');
    console.log('4. Tell me the account ID and I\'ll set it up for testing');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

forceClearStripe();