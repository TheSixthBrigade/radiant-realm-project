// Clear all invalid Stripe accounts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllInvalidAccounts() {
  console.log('🧹 Clearing All Invalid Stripe Accounts\n');

  try {
    // Clear all Stripe Connect accounts since they're from a different Stripe account
    const { error: clearError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: null,
        stripe_connect_status: null
      })
      .not('stripe_connect_account_id', 'is', null);

    if (clearError) {
      console.error('❌ Error clearing accounts:', clearError.message);
      return;
    }

    console.log('✅ Cleared all invalid Stripe Connect accounts');
    console.log('📝 All users will need to reconnect their Stripe accounts\n');

    // Show current status
    const { data: profiles } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .not('display_name', 'is', null);

    console.log('👥 Current Stripe Status:');
    profiles?.forEach(profile => {
      const hasStripe = profile.stripe_connect_account_id && profile.stripe_connect_status === 'connected';
      console.log(`   ${profile.display_name}: ${hasStripe ? '✅ Connected' : '❌ Not connected'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearAllInvalidAccounts();