// Test payment method validation fixes
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentValidation() {
  console.log('🧪 Testing Payment Method Validation\n');

  try {
    // Get all profiles with their payment methods
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, paypal_email, paypal_onboarding_status, stripe_connect_account_id, stripe_connect_status')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }

    console.log('👥 User Payment Method Status:\n');

    profiles?.forEach((profile, index) => {
      const hasPayPal = profile.paypal_email && profile.paypal_onboarding_status === 'completed';
      const hasStripe = profile.stripe_connect_account_id && profile.stripe_connect_status === 'connected';
      const canSell = hasPayPal || hasStripe;

      console.log(`${index + 1}. ${profile.display_name || 'No name'}`);
      console.log(`   PayPal: ${hasPayPal ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`   Stripe: ${hasStripe ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`   Can Sell: ${canSell ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    // Test specific scenarios
    console.log('🎯 Test Scenarios:');
    
    const paypalOnly = profiles?.find(p => 
      p.paypal_email && p.paypal_onboarding_status === 'completed' && 
      (!p.stripe_connect_account_id || p.stripe_connect_status !== 'connected')
    );
    
    const stripeOnly = profiles?.find(p => 
      p.stripe_connect_account_id && p.stripe_connect_status === 'connected' && 
      (!p.paypal_email || p.paypal_onboarding_status !== 'completed')
    );
    
    const both = profiles?.find(p => 
      p.paypal_email && p.paypal_onboarding_status === 'completed' &&
      p.stripe_connect_account_id && p.stripe_connect_status === 'connected'
    );
    
    const neither = profiles?.find(p => 
      (!p.paypal_email || p.paypal_onboarding_status !== 'completed') &&
      (!p.stripe_connect_account_id || p.stripe_connect_status !== 'connected')
    );

    console.log(`PayPal Only: ${paypalOnly ? `✅ ${paypalOnly.display_name}` : '❌ None found'}`);
    console.log(`Stripe Only: ${stripeOnly ? `✅ ${stripeOnly.display_name}` : '❌ None found'}`);
    console.log(`Both Methods: ${both ? `✅ ${both.display_name}` : '❌ None found'}`);
    console.log(`No Methods: ${neither ? `❌ ${neither.display_name}` : '✅ None found'}`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n💡 Expected Behavior:');
  console.log('✅ Users with PayPal OR Stripe should be able to sell');
  console.log('✅ Users with BOTH should be able to sell');
  console.log('❌ Users with NEITHER should NOT be able to sell');
  console.log('\n🔧 If issues persist, check:');
  console.log('1. Browser cache - hard refresh the page');
  console.log('2. Database field names are correct');
  console.log('3. All components are using the updated logic');
}

testPaymentValidation();