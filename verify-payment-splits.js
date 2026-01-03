// Script to verify Stripe Connect payment splits in test mode
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPaymentSplits() {
  console.log('💰 Verifying Payment Splits in Test Mode\n');

  try {
    // Get recent transactions
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_method', 'stripe')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching transactions:', error.message);
      return;
    }

    // Get additional data for each transaction
    const enrichedTransactions = [];
    for (const tx of transactions || []) {
      // Get product info
      const { data: product } = await supabase
        .from('products')
        .select('title, price')
        .eq('id', tx.product_id)
        .single();

      // Get buyer info
      const { data: buyer } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', tx.buyer_id)
        .single();

      // Get seller info
      const { data: seller } = await supabase
        .from('profiles')
        .select('display_name, stripe_connect_account_id')
        .eq('user_id', tx.seller_id)
        .single();

      enrichedTransactions.push({
        ...tx,
        product,
        buyer,
        seller
      });
    }

    const finalTransactions = enrichedTransactions;

    if (!finalTransactions || finalTransactions.length === 0) {
      console.log('📝 No Stripe transactions found yet.');
      console.log('💡 Complete a test purchase first, then run this script again.');
      return;
    }

    console.log(`📊 Found ${finalTransactions.length} recent Stripe transaction(s):\n`);

    finalTransactions.forEach((tx, index) => {
      console.log(`🔸 Transaction ${index + 1}:`);
      console.log(`   Product: ${tx.product?.title}`);
      console.log(`   Original Price: $${tx.product?.price}`);
      console.log(`   Total Amount: $${tx.amount}`);
      console.log(`   Platform Fee (5%): $${tx.platform_fee}`);
      console.log(`   Seller Amount (95%): $${tx.seller_amount}`);
      console.log(`   Buyer: ${tx.buyer?.display_name}`);
      console.log(`   Seller: ${tx.seller?.display_name}`);
      console.log(`   Seller Stripe Account: ${tx.seller?.stripe_connect_account_id}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Payout Status: ${tx.payout_status}`);
      console.log(`   Stripe Session: ${tx.stripe_session_id}`);
      console.log(`   Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    });

    // Calculate totals
    const totalAmount = finalTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const totalPlatformFees = finalTransactions.reduce((sum, tx) => sum + parseFloat(tx.platform_fee), 0);
    const totalSellerAmount = finalTransactions.reduce((sum, tx) => sum + parseFloat(tx.seller_amount), 0);

    console.log('📈 Summary:');
    console.log(`   Total Processed: $${totalAmount.toFixed(2)}`);
    console.log(`   Platform Earned: $${totalPlatformFees.toFixed(2)} (${((totalPlatformFees/totalAmount)*100).toFixed(1)}%)`);
    console.log(`   Sellers Earned: $${totalSellerAmount.toFixed(2)} (${((totalSellerAmount/totalAmount)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }

  console.log('\n🔍 How to verify in Stripe Dashboard:');
  console.log('1. Go to https://dashboard.stripe.com/test/payments');
  console.log('2. Look for recent payments - they should show:');
  console.log('   • Application fee amount (your 5% commission)');
  console.log('   • Transfer to connected account (seller\'s 95%)');
  console.log('3. Go to https://dashboard.stripe.com/test/connect/accounts');
  console.log('4. Click on a connected account to see their balance');
  console.log('5. Check https://dashboard.stripe.com/test/balance for your platform balance');
  
  console.log('\n💡 Test Mode Notes:');
  console.log('• Use test card: 4242 4242 4242 4242');
  console.log('• Any future expiry date and CVC');
  console.log('• No real money is processed');
  console.log('• All transactions are simulated');
}

verifyPaymentSplits();