/**
 * Debug script to check affiliate tracking flow
 * Run: node debug-affiliate-flow.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function debugAffiliateFlow() {
  console.log('=== Affiliate Flow Debug ===\n');

  // 1. Check affiliate_links table
  console.log('1. Checking affiliate_links table...');
  const { data: links, error: linksError } = await supabase
    .from('affiliate_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (linksError) {
    console.error('   Error fetching links:', linksError.message);
  } else {
    console.log(`   Found ${links?.length || 0} affiliate links:`);
    links?.forEach(link => {
      console.log(`   - Code: ${link.code}, Clicks: ${link.clicks}, Conversions: ${link.conversions}, Earnings: $${link.earnings}`);
    });
  }

  // 2. Check affiliate_referrals table
  console.log('\n2. Checking affiliate_referrals table...');
  const { data: referrals, error: referralsError } = await supabase
    .from('affiliate_referrals')
    .select('*, affiliate_links(code)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (referralsError) {
    console.error('   Error fetching referrals:', referralsError.message);
  } else {
    console.log(`   Found ${referrals?.length || 0} referrals:`);
    referrals?.forEach(ref => {
      console.log(`   - Link: ${ref.affiliate_links?.code}, Commission: $${ref.commission_amount}, Status: ${ref.status}`);
    });
  }

  // 3. Check recent sales for affiliate_ref in metadata
  console.log('\n3. Checking recent sales...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, amount, created_at, stripe_payment_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (salesError) {
    console.error('   Error fetching sales:', salesError.message);
  } else {
    console.log(`   Found ${sales?.length || 0} recent sales:`);
    sales?.forEach(sale => {
      console.log(`   - ID: ${sale.id}, Amount: $${sale.amount}, Date: ${sale.created_at}`);
    });
  }

  // 4. Check payment_transactions for affiliate metadata
  console.log('\n4. Checking payment_transactions...');
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('   Error fetching transactions:', txError.message);
  } else {
    console.log(`   Found ${transactions?.length || 0} recent transactions:`);
    transactions?.forEach(tx => {
      console.log(`   - Session: ${tx.stripe_session_id}, Status: ${tx.status}, Amount: $${tx.amount}`);
    });
  }

  // 5. Check affiliate_settings
  console.log('\n5. Checking affiliate_settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('affiliate_settings')
    .select('*');

  if (settingsError) {
    console.error('   Error fetching settings:', settingsError.message);
  } else {
    console.log(`   Found ${settings?.length || 0} affiliate settings:`);
    settings?.forEach(s => {
      console.log(`   - Creator: ${s.creator_id}, Enabled: ${s.is_enabled}, Rate: ${s.commission_rate * 100}%`);
    });
  }

  console.log('\n=== Debug Complete ===');
  console.log('\nPossible issues to check:');
  console.log('1. Is the affiliate_ref being passed in checkout metadata?');
  console.log('2. Is the Stripe webhook receiving events?');
  console.log('3. Is the webhook updating affiliate_links table?');
  console.log('4. Check Stripe Dashboard > Webhooks for event logs');
}

debugAffiliateFlow().catch(console.error);
