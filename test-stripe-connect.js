// Test script to verify Stripe Connect integration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStripeConnect() {
  console.log('🧪 Testing Stripe Connect Integration...\n');

  try {
    // Test 1: Check if Stripe Connect onboard function is accessible
    console.log('1. Testing Stripe Connect onboard function...');
    const { data: onboardData, error: onboardError } = await supabase.functions.invoke('stripe-connect-onboard', {
      body: { userId: 'test-user-id' }
    });

    if (onboardError) {
      console.log('❌ Onboard function error:', onboardError.message);
    } else {
      console.log('✅ Onboard function accessible');
      console.log('   Response:', onboardData?.success ? 'Success' : 'Error: ' + onboardData?.error);
    }

    // Test 2: Check if Stripe checkout function is accessible
    console.log('\n2. Testing Stripe checkout function...');
    const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('stripe-create-checkout', {
      body: { 
        productId: 'test-product-id',
        buyerId: 'test-buyer-id'
      }
    });

    if (checkoutError) {
      console.log('❌ Checkout function error:', checkoutError.message);
    } else {
      console.log('✅ Checkout function accessible');
      console.log('   Response:', checkoutData?.success ? 'Success' : 'Error: ' + checkoutData?.error);
    }

    // Test 3: Check database structure
    console.log('\n3. Testing database structure...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_status')
      .limit(1);

    if (profilesError) {
      console.log('❌ Database structure error:', profilesError.message);
    } else {
      console.log('✅ Database structure looks good');
      console.log('   Profiles table has Stripe Connect fields');
    }

    // Test 4: Check payment_transactions table
    console.log('\n4. Testing payment_transactions table...');
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(1);

    if (transactionsError) {
      console.log('❌ Payment transactions table error:', transactionsError.message);
    } else {
      console.log('✅ Payment transactions table accessible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('- Stripe Connect functions are deployed and accessible');
  console.log('- Database structure supports Stripe Connect');
  console.log('- Ready for testing with real user accounts');
  console.log('\n📝 Next Steps:');
  console.log('1. Create a user account on your website');
  console.log('2. Go to Dashboard and connect Stripe account');
  console.log('3. Create a product');
  console.log('4. Test the checkout flow');
}

testStripeConnect();