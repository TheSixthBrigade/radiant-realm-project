// Simple test to check if the seller has a valid Stripe account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSellerStripeAccount() {
  console.log('🔍 Checking Seller Stripe Accounts\n');

  try {
    // Get all products and their creators
    const { data: products } = await supabase
      .from('products')
      .select('id, title, creator_id')
      .limit(5);

    if (!products || products.length === 0) {
      console.log('❌ No products found');
      return;
    }

    for (const product of products) {
      console.log(`\n📦 Product: ${product.title}`);
      
      // Get creator's Stripe info
      const { data: creator } = await supabase
        .from('profiles')
        .select('display_name, stripe_connect_account_id, stripe_connect_status')
        .eq('user_id', product.creator_id)
        .single();

      if (creator) {
        console.log(`👤 Creator: ${creator.display_name}`);
        console.log(`🔗 Stripe Account: ${creator.stripe_connect_account_id || 'None'}`);
        console.log(`📊 Status: ${creator.stripe_connect_status || 'Not connected'}`);
        
        const canAcceptPayments = creator.stripe_connect_account_id && creator.stripe_connect_status === 'connected';
        console.log(`💳 Can Accept Payments: ${canAcceptPayments ? '✅ YES' : '❌ NO'}`);
        
        if (canAcceptPayments) {
          console.log('🎯 This product should work for Stripe payments!');
        }
      } else {
        console.log('❌ Creator not found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSellerStripeAccount();