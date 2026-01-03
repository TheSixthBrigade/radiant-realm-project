import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSellerPayPal() {
  console.log('Checking seller PayPal setup...\n');
  
  // Get a product
  const { data: products } = await supabase
    .from('products')
    .select('id, title, creator_id')
    .limit(1);
  
  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }
  
  const product = products[0];
  console.log('Product:', product.title);
  console.log('Creator ID:', product.creator_id);
  
  // Get creator's profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('paypal_email, paypal_onboarding_status, stripe_account_id, stripe_onboarding_status')
    .eq('user_id', product.creator_id)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\nSeller Payment Setup:');
  console.log('─'.repeat(50));
  console.log('PayPal Email:', profile.paypal_email || '❌ NOT SET');
  console.log('PayPal Status:', profile.paypal_onboarding_status || 'not_started');
  console.log('Stripe Account:', profile.stripe_account_id || '❌ NOT SET');
  console.log('Stripe Status:', profile.stripe_onboarding_status || 'not_started');
  console.log('─'.repeat(50));
  
  if (!profile.paypal_email && !profile.stripe_account_id) {
    console.log('\n❌ PROBLEM: Seller has NO payment method set up!');
    console.log('\n📝 TO FIX:');
    console.log('1. Log in as this seller');
    console.log('2. Go to Dashboard → Settings');
    console.log('3. Enter PayPal email OR connect Stripe');
  } else if (profile.paypal_email && profile.paypal_onboarding_status !== 'completed') {
    console.log('\n⚠️  PayPal email is set but status is not "completed"');
    console.log('Status should be: completed');
    console.log('Current status:', profile.paypal_onboarding_status);
  } else {
    console.log('\n✅ Seller has payment method configured!');
  }
}

checkSellerPayPal();
