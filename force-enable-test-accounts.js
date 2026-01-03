// Force enable test accounts for development testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceEnableTestAccounts() {
  console.log('🚀 Force Enabling Test Accounts for Development\n');

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

    console.log(`Found ${profiles.length} pending account(s). Force enabling for testing...\n`);

    for (const profile of profiles) {
      console.log(`🔧 Force enabling: ${profile.display_name}`);
      
      // Force update status to connected for testing
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_connect_status: 'connected' })
        .eq('user_id', profile.user_id);

      if (updateError) {
        console.log(`   ❌ Error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Status updated to 'connected'`);
      }
    }

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('• This is for TESTING ONLY in development mode');
    console.log('• Real payments may fail if Stripe accounts are not fully onboarded');
    console.log('• For production, accounts must complete full Stripe onboarding');
    console.log('• This allows you to test the payment flow and see money splits');

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Refresh your dashboard page');
  console.log('2. Status should now show "Stripe account connected!"');
  console.log('3. Create a test product');
  console.log('4. Try the checkout flow with test card: 4242 4242 4242 4242');
}

forceEnableTestAccounts();