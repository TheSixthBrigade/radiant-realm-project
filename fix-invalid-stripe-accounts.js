// Fix invalid Stripe accounts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvalidStripeAccounts() {
  console.log('🔧 Fixing Invalid Stripe Accounts\n');

  try {
    // Clear the invalid Stripe account for rangecluub
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: null,
        stripe_connect_status: null
      })
      .eq('stripe_connect_account_id', 'acct_1Sg1kHANWdH2fLrU');

    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message);
      return;
    }

    console.log('✅ Cleared invalid Stripe account for rangecluub');
    console.log('📝 User will need to reconnect their Stripe account');

    // Also clear any other potentially invalid accounts
    const invalidAccounts = [
      'acct_1Sg1APApUw886Ebi', // john cheetah - pending status
    ];

    for (const accountId of invalidAccounts) {
      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: null,
          stripe_connect_status: null
        })
        .eq('stripe_connect_account_id', accountId);

      if (!error) {
        console.log(`✅ Cleared account: ${accountId}`);
      }
    }

    console.log('\n🎯 Now try purchasing from these sellers:');
    
    // Show valid sellers
    const { data: validSellers } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('stripe_connect_status', 'connected')
      .not('stripe_connect_account_id', 'is', null);

    if (validSellers && validSellers.length > 0) {
      validSellers.forEach(seller => {
        console.log(`✅ ${seller.display_name} - ${seller.stripe_connect_account_id}`);
      });
    } else {
      console.log('❌ No valid Stripe sellers found');
      console.log('💡 You may need to create a test seller account');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixInvalidStripeAccounts();