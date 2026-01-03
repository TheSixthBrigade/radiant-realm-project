// Enable test account capabilities for current user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableTestAccount() {
  console.log('🔧 Enabling Test Account Capabilities\n');

  try {
    // Get users with pending Stripe accounts
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('stripe_connect_status', 'pending')
      .not('stripe_connect_account_id', 'is', null);

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('📝 No pending Stripe accounts found.');
      return;
    }

    console.log(`Found ${profiles.length} pending account(s):\n`);

    for (const profile of profiles) {
      console.log(`🔧 Enabling account for: ${profile.display_name}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   Account ID: ${profile.stripe_connect_account_id}`);

      const { data, error: enableError } = await supabase.functions.invoke('stripe-enable-test-account', {
        body: { userId: profile.user_id }
      });

      if (enableError) {
        console.log(`   ❌ Error: ${enableError.message}`);
      } else if (data?.success) {
        console.log(`   ✅ ${data.message}`);
        console.log(`   Charges Enabled: ${data.charges_enabled}`);
        console.log(`   Payouts Enabled: ${data.payouts_enabled}`);
        console.log(`   Status: ${data.status}`);
      } else {
        console.log(`   ❌ Failed: ${data?.error}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }

  console.log('💡 Next Steps:');
  console.log('1. Refresh your dashboard page');
  console.log('2. The Stripe status should now show "connected"');
  console.log('3. Try creating a product and testing checkout');
}

enableTestAccount();