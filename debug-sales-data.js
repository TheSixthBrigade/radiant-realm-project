/**
 * Debug script to check sales data in Supabase
 * Run with: node debug-sales-data.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSalesData() {
  console.log('🔍 Debugging Sales Data...\n');

  try {
    // 1. Check all products
    console.log('📦 Fetching all products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price, downloads, creator_id')
      .limit(20);
    
    if (productsError) {
      console.error('❌ Products error:', productsError.message);
    } else {
      console.log(`   Found ${products?.length || 0} products`);
      products?.forEach(p => {
        console.log(`   - ${p.title}: $${p.price}, ${p.downloads} downloads, creator: ${p.creator_id?.substring(0, 8)}...`);
      });
    }

    // 2. Check all sales (this will fail if RLS blocks it)
    console.log('\n💰 Fetching all sales...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(20);
    
    if (salesError) {
      console.error('❌ Sales error:', salesError.message);
      console.log('   This likely means RLS is blocking the query.');
      console.log('   You need to apply the RLS fix in Supabase Dashboard.');
    } else {
      console.log(`   Found ${sales?.length || 0} sales records`);
      sales?.forEach(s => {
        console.log(`   - Sale ID: ${s.id?.substring(0, 8)}..., Amount: $${s.amount}, Product: ${s.product_id?.substring(0, 8)}...`);
      });
    }

    // 3. Check if sales have amount populated
    if (sales && sales.length > 0) {
      const salesWithAmount = sales.filter(s => s.amount && Number(s.amount) > 0);
      const salesWithoutAmount = sales.filter(s => !s.amount || Number(s.amount) === 0);
      
      console.log(`\n📊 Sales Analysis:`);
      console.log(`   Sales with amount > 0: ${salesWithAmount.length}`);
      console.log(`   Sales with amount = 0 or null: ${salesWithoutAmount.length}`);
      
      if (salesWithoutAmount.length > 0) {
        console.log('\n⚠️ Found sales with $0 amount - these need to be fixed!');
        console.log('   This usually happens when the Stripe webhook doesn\'t populate the amount.');
      }
    }

    // 4. Check profiles for creator status
    console.log('\n👤 Checking profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, is_creator, stripe_connect_status')
      .eq('is_creator', true)
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Profiles error:', profilesError.message);
    } else {
      console.log(`   Found ${profiles?.length || 0} creator profiles`);
      profiles?.forEach(p => {
        console.log(`   - ${p.display_name || 'No name'}: Stripe status = ${p.stripe_connect_status || 'not connected'}`);
      });
    }

    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    if (salesError) {
      console.log('\n1. ❌ RLS POLICY ISSUE:');
      console.log('   The sales table RLS is blocking queries.');
      console.log('   Go to: https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt/sql/new');
      console.log('   And run this SQL:\n');
      console.log(`   DROP POLICY IF EXISTS "Users can view their own purchases" ON public.sales;
   CREATE POLICY "Users can view their purchases and creators can view their sales"
   ON public.sales FOR SELECT
   USING (
     auth.uid() = buyer_id 
     OR product_id IN (SELECT id FROM public.products WHERE creator_id = auth.uid())
   );`);
    }
    
    if (sales && sales.some(s => !s.amount || Number(s.amount) === 0)) {
      console.log('\n2. ⚠️ SALES AMOUNT ISSUE:');
      console.log('   Some sales have $0 amount. This needs to be fixed.');
      console.log('   The Stripe webhook should populate the amount when checkout completes.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugSalesData();
