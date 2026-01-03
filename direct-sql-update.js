// Direct SQL update using edge function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function directSqlUpdate() {
  console.log('🔧 Direct SQL Update\n');

  try {
    // Try using RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `UPDATE profiles SET stripe_connect_account_id = 'acct_1Sg2qwDr84RdnXCX', stripe_connect_status = 'connected' WHERE display_name = 'John'`
    });

    if (error) {
      console.log('RPC not available, trying direct update...');
      
      // Fallback to direct update with specific conditions
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: 'acct_1Sg2qwDr84RdnXCX',
          stripe_connect_status: 'connected'
        })
        .eq('display_name', 'John')
        .eq('user_id', 'f8999992-eb28-46fa-aabd-dc9571fd1bc5');

      if (updateError) {
        console.error('❌ Update error:', updateError.message);
        return;
      }
    }

    console.log('✅ Update completed');

    // Verify
    const { data: result } = await supabase
      .from('profiles')
      .select('display_name, stripe_connect_account_id, stripe_connect_status')
      .eq('display_name', 'John');

    console.log('📊 Current John accounts:', result);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

directSqlUpdate();