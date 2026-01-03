// Verify the update worked
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyUpdate() {
  console.log('🔍 Verifying Update\n');

  try {
    // Check the specific user ID that owns test123
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('user_id', '99b50abb-911f-4347-a10a-02034cab2cd1')
      .single();

    if (profile) {
      console.log('👤 Profile for test123 creator:');
      console.log(`   Name: ${profile.display_name}`);
      console.log(`   Account: ${profile.stripe_connect_account_id}`);
      console.log(`   Status: ${profile.stripe_connect_status}`);
      
      if (profile.stripe_connect_account_id === 'acct_1Sg2qwDr84RdnXCX') {
        console.log('✅ Update successful!');
        console.log('\n🎯 Now you can test:');
        console.log('1. Go to your website');
        console.log('2. Buy "test123" from rangecluub ($0.50)');
        console.log('3. Use test card: 4242 4242 4242 4242');
        console.log('4. Check your Stripe dashboard for payment split');
      } else {
        console.log('❌ Update failed - still showing old account');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyUpdate();