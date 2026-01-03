// Test Stripe Connect onboarding for a specific user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStripeOnboard() {
  console.log('🔗 Testing Stripe Connect Onboarding\n');

  try {
    // Get current user profiles with Stripe info
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_connect_account_id, stripe_connect_status')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }

    console.log('👥 Recent User Profiles:');
    profiles?.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.display_name || 'No name'}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   Stripe Account: ${profile.stripe_connect_account_id || 'Not connected'}`);
      console.log(`   Status: ${profile.stripe_connect_status || 'not_connected'}`);
      console.log('');
    });

    // Test onboarding for the first user
    if (profiles && profiles.length > 0) {
      const testUser = profiles[0];
      console.log(`🧪 Testing onboarding for: ${testUser.display_name}`);
      
      const { data: onboardData, error: onboardError } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { userId: testUser.user_id }
      });

      if (onboardError) {
        console.log('❌ Onboard error:', onboardError.message);
      } else if (onboardData?.success) {
        console.log('✅ Onboarding URL generated successfully');
        console.log('   Account ID:', onboardData.accountId);
        console.log('   URL:', onboardData.onboardingUrl);
        
        // Check if the account was saved to database
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('stripe_connect_account_id, stripe_connect_status')
          .eq('user_id', testUser.user_id)
          .single();
          
        console.log('   Database Status:', updatedProfile?.stripe_connect_status);
        console.log('   Database Account ID:', updatedProfile?.stripe_connect_account_id);
      } else {
        console.log('❌ Onboard failed:', onboardData?.error);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n💡 Manual Steps to Test:');
  console.log('1. Go to your website dashboard');
  console.log('2. Click "Connect Stripe Account"');
  console.log('3. Complete the Stripe onboarding flow');
  console.log('4. You should be redirected back with stripe_success=true');
  console.log('5. The status should update to "connected"');
}

testStripeOnboard();