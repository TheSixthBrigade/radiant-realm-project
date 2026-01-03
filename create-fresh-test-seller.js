// Create a fresh test seller account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFreshTestSeller() {
  console.log('🔧 Creating Fresh Test Seller\n');

  const newAccountId = 'acct_1Sg2qwDr84RdnXCX';

  try {
    // Update rangecluub instead (they should be cleared)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: newAccountId,
        stripe_connect_status: 'connected'
      })
      .eq('display_name', 'rangecluub');

    if (updateError) {
      console.error('❌ Error updating rangecluub:', updateError.message);
      return;
    }

    console.log('✅ Set up rangecluub as test seller');
    console.log(`🔗 Stripe Account: ${newAccountId}`);

    // Verify
    const { data: seller } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('display_name', 'rangecluub')
      .single();

    if (seller) {
      console.log('\n✅ Verification:');
      console.log(`   Name: ${seller.display_name}`);
      console.log(`   Account: ${seller.stripe_connect_account_id}`);
      console.log(`   Status: ${seller.stripe_connect_status}`);
    }

    // Check if rangecluub has any products
    const { data: products } = await supabase
      .from('products')
      .select('title, price, creator_id')
      .limit(10);

    console.log('\n🛍️ Available products:');
    if (products) {
      for (const product of products) {
        // Get creator name
        const { data: creator } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', product.creator_id)
          .single();

        console.log(`   • ${product.title} - $${product.price} by ${creator?.display_name || 'Unknown'}`);
      }
    }

    console.log('\n🎯 Now test with:');
    console.log('1. Buy a product from "rangecluub" (test123)');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Check Stripe dashboard for payment split');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createFreshTestSeller();