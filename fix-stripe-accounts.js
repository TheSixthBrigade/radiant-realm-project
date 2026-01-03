// Fix Stripe Connect account statuses
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStripeAccounts() {
  console.log('🔧 Fixing Stripe Connect Account Statuses\n');

  try {
    const { data, error } = await supabase.functions.invoke('stripe-check-accounts');

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (data?.success) {
      console.log(`✅ Checked ${data.checked} accounts\n`);
      
      data.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.display_name}`);
        if (result.error) {
          console.log(`   ❌ Error: ${result.error}`);
        } else {
          console.log(`   Account: ${result.account_id}`);
          console.log(`   Charges Enabled: ${result.charges_enabled}`);
          console.log(`   Payouts Enabled: ${result.payouts_enabled}`);
          console.log(`   Status: ${result.old_status} → ${result.new_status}`);
          if (result.updated) {
            console.log(`   ✅ Updated!`);
          } else {
            console.log(`   ℹ️  No update needed`);
          }
        }
        console.log('');
      });
    } else {
      console.log('❌ Failed:', data?.error);
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }

  console.log('💡 Next Steps:');
  console.log('1. Refresh your dashboard page');
  console.log('2. The Stripe Connect status should now be correct');
  console.log('3. Try creating a product and testing checkout');
}

fixStripeAccounts();