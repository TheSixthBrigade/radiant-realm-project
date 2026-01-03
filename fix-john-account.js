// Fix John's account with the correct ID
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixJohnAccount() {
  console.log('🔧 Fixing John\'s Stripe Account\n');

  const newAccountId = 'acct_1Sg2qwDr84RdnXCX';

  try {
    // Get John's user ID first
    const { data: john } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_connect_account_id')
      .eq('display_name', 'John')
      .single();

    if (!john) {
      console.log('❌ John not found');
      return;
    }

    console.log(`👤 Found John: ${john.user_id}`);
    console.log(`🔗 Current Account: ${john.stripe_connect_account_id}`);

    // Update with the new account ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: newAccountId,
        stripe_connect_status: 'connected'
      })
      .eq('user_id', john.user_id);

    if (updateError) {
      console.error('❌ Error updating:', updateError.message);
      return;
    }

    console.log(`✅ Updated to: ${newAccountId}`);

    // Verify the change
    const { data: updated } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('user_id', john.user_id)
      .single();

    if (updated) {
      console.log('\n✅ Verification:');
      console.log(`   Name: ${updated.display_name}`);
      console.log(`   Account: ${updated.stripe_connect_account_id}`);
      console.log(`   Status: ${updated.stripe_connect_status}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixJohnAccount();