// Check all recent transactions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTransactions() {
  console.log('🔍 Checking All Recent Transactions\n');

  try {
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('📝 No transactions found in database.');
      return;
    }

    console.log(`📊 Found ${transactions.length} transaction(s):\n`);

    transactions.forEach((tx, index) => {
      console.log(`🔸 Transaction ${index + 1}:`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   Product ID: ${tx.product_id}`);
      console.log(`   Buyer ID: ${tx.buyer_id}`);
      console.log(`   Seller ID: ${tx.seller_id}`);
      console.log(`   Amount: $${tx.amount}`);
      console.log(`   Platform Fee: $${tx.platform_fee}`);
      console.log(`   Seller Amount: $${tx.seller_amount}`);
      console.log(`   Payment Method: ${tx.payment_method}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Payout Status: ${tx.payout_status}`);
      console.log(`   Stripe Session: ${tx.stripe_session_id}`);
      console.log(`   Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkAllTransactions();