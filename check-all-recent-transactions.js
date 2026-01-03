// Check all recent transactions regardless of payment method
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTransactions() {
  console.log('🔍 Checking All Recent Transactions\n');

  try {
    // Get all recent transactions
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching transactions:', error.message);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('📝 No transactions found in database.');
      console.log('\n💡 This could mean:');
      console.log('1. The webhook hasn\'t processed yet (wait 10-30 seconds)');
      console.log('2. The payment didn\'t complete successfully');
      console.log('3. There\'s an issue with the webhook handler');
      return;
    }

    console.log(`📊 Found ${transactions.length} transaction(s):\n`);

    for (const tx of transactions) {
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

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Product: ${product?.title || 'Unknown'}`);
      console.log(`💵 Amount: $${tx.amount}`);
      console.log(`🏪 Platform Fee (5%): $${tx.platform_fee}`);
      console.log(`👤 Seller Gets (95%): $${tx.seller_amount}`);
      console.log(`🛒 Buyer: ${buyer?.display_name || 'Unknown'}`);
      console.log(`💰 Seller: ${seller?.display_name || 'Unknown'}`);
      console.log(`🔗 Seller Stripe Account: ${seller?.stripe_connect_account_id || 'None'}`);
      console.log(`📊 Status: ${tx.status}`);
      console.log(`💸 Payout Status: ${tx.payout_status}`);
      console.log(`💳 Payment Method: ${tx.payment_method}`);
      console.log(`🆔 Transaction ID: ${tx.stripe_session_id || tx.paypal_order_id || 'N/A'}`);
      console.log(`📅 Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    }

    // Calculate totals
    const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const totalPlatformFees = transactions.reduce((sum, tx) => sum + parseFloat(tx.platform_fee), 0);
    const totalSellerAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.seller_amount), 0);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 TOTALS:');
    console.log(`   💵 Total Processed: $${totalAmount.toFixed(2)}`);
    console.log(`   🏪 Platform Earned: $${totalPlatformFees.toFixed(2)} (${((totalPlatformFees/totalAmount)*100).toFixed(1)}%)`);
    console.log(`   👥 Sellers Earned: $${totalSellerAmount.toFixed(2)} (${((totalSellerAmount/totalAmount)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }

  console.log('\n🔍 How to verify in Stripe Dashboard:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 💳 Payments: https://dashboard.stripe.com/test/payments');
  console.log('   → Look for the payment with application fee');
  console.log('   → Click on it to see the breakdown');
  console.log('');
  console.log('2. 🔗 Connected Accounts: https://dashboard.stripe.com/test/connect/accounts');
  console.log('   → Click on the seller\'s account');
  console.log('   → Check their balance (should show the 95%)');
  console.log('');
  console.log('3. 💰 Your Balance: https://dashboard.stripe.com/test/balance');
  console.log('   → Should show your 5% commission');
  console.log('');
  console.log('4. 📊 Transfers: https://dashboard.stripe.com/test/connect/transfers');
  console.log('   → Shows money transferred to connected accounts');
}

checkAllTransactions();
