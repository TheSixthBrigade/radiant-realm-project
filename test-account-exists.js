// Test if the account exists in your Stripe dashboard
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAccountExists() {
  console.log('🔍 Testing Account Existence\n');

  try {
    // Test with a minimal checkout to see the exact error
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
      body: {
        productId: 'test-product-id',
        buyerId: 'test-buyer-id'
      }
    });

    console.log('📊 Response:');
    console.log('Data:', data);
    console.log('Error:', error);

    if (data?.error) {
      console.log('\n❌ Error Details:', data.error);
      
      if (data.error.includes('No such destination')) {
        console.log('\n🚨 The account acct_1Sg2qwDr84RdnXCX does not exist in your Stripe dashboard!');
        console.log('\n🔧 Solutions:');
        console.log('1. Go to: https://dashboard.stripe.com/test/connect/accounts');
        console.log('2. Check if acct_1Sg2qwDr84RdnXCX exists');
        console.log('3. If not, create a new Express account');
        console.log('4. Copy the new account ID');
        console.log('5. Tell me the new ID to update the code');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAccountExists();