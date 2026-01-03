// Test Stripe configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStripeConfig() {
  console.log('🔧 Testing Stripe Configuration\n');

  try {
    // Test the edge function directly
    console.log('📡 Testing Stripe checkout edge function...');
    
    // Get a test product first
    const { data: products } = await supabase
      .from('products')
      .select('id, title, price, creator_id')
      .limit(1);

    if (!products || products.length === 0) {
      console.log('❌ No products found to test with');
      return;
    }

    const testProduct = products[0];
    console.log(`🛍️ Using test product: ${testProduct.title} ($${testProduct.price})`);

    // Test the edge function
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
      body: {
        productId: testProduct.id,
        buyerId: 'test-buyer-id'
      }
    });

    console.log('\n📊 Edge Function Response:');
    console.log('Data:', data);
    console.log('Error:', error);

    if (data?.success) {
      console.log('✅ Stripe checkout session created successfully!');
      console.log('🔗 Session ID:', data.sessionId);
      console.log('🌐 Checkout URL:', data.url);
    } else {
      console.log('❌ Stripe checkout failed');
      console.log('Error details:', data?.error || error?.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n🔍 Troubleshooting Steps:');
  console.log('1. Check if STRIPE_SECRET_KEY is set in Supabase Edge Functions');
  console.log('2. Verify the secret key starts with "sk_test_" for test mode');
  console.log('3. Make sure the seller has a connected Stripe account');
  console.log('4. Check Supabase Edge Function logs for detailed errors');
}

testStripeConfig();