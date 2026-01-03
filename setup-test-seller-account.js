// Set up the test seller account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestSeller() {
  console.log('🔧 Setting Up Test Seller Account\n');

  const testSellerAccountId = 'acct_1Sg2qwDr84RdnXCX';

  try {
    // Set up John as the test seller with the new account ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: testSellerAccountId,
        stripe_connect_status: 'connected'
      })
      .eq('display_name', 'John');

    if (updateError) {
      console.error('❌ Error setting up seller:', updateError.message);
      return;
    }

    console.log('✅ Set up John as test seller');
    console.log(`🔗 Stripe Account: ${testSellerAccountId}`);
    console.log('📊 Status: connected');

    // Verify the setup
    const { data: seller } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('display_name', 'John')
      .single();

    if (seller) {
      console.log('\n✅ Verification:');
      console.log(`   Name: ${seller.display_name}`);
      console.log(`   Account: ${seller.stripe_connect_account_id}`);
      console.log(`   Status: ${seller.stripe_connect_status}`);
    }

    // Show products you can test with
    const { data: products } = await supabase
      .from('products')
      .select('title, price')
      .eq('creator_id', seller ? 
        (await supabase.from('profiles').select('user_id').eq('display_name', 'John').single()).data?.user_id 
        : null)
      .limit(3);

    if (products && products.length > 0) {
      console.log('\n🛍️ Products you can test with:');
      products.forEach(product => {
        console.log(`   • ${product.title} - $${product.price}`);
      });
    }

    console.log('\n🎯 Now you can test:');
    console.log('1. Go to your website');
    console.log('2. Buy a product from "John"');
    console.log('3. Use test card: 4242 4242 4242 4242');
    console.log('4. Check your Stripe dashboard for the payment split');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupTestSeller();