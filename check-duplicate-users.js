// Check for duplicate users
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateUsers() {
  console.log('🔍 Checking for Duplicate Users\n');

  try {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_connect_account_id, stripe_connect_status, created_at')
      .order('created_at', { ascending: false });

    if (profiles) {
      console.log('👥 All Profiles:');
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.display_name} (${profile.user_id})`);
        console.log(`   Stripe: ${profile.stripe_connect_account_id || 'None'}`);
        console.log(`   Status: ${profile.stripe_connect_status || 'None'}`);
        console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
        console.log('');
      });

      // Check for duplicates
      const names = profiles.map(p => p.display_name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.log('🚨 Duplicate names found:', [...new Set(duplicates)]);
      } else {
        console.log('✅ No duplicate names found');
      }
    }

    // Now let's manually update the specific user ID for rangecluub's product
    const { data: product } = await supabase
      .from('products')
      .select('creator_id')
      .eq('title', 'test123')
      .single();

    if (product) {
      console.log(`\n🎯 Product "test123" creator ID: ${product.creator_id}`);
      
      // Update this specific user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: 'acct_1Sg2qwDr84RdnXCX',
          stripe_connect_status: 'connected'
        })
        .eq('user_id', product.creator_id);

      if (updateError) {
        console.error('❌ Error updating:', updateError.message);
      } else {
        console.log('✅ Updated the correct rangecluub account');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDuplicateUsers();