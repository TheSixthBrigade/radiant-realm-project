// EMERGENCY FIX: Run this in browser console to add missing columns
// This uses Supabase's RPC function to execute SQL directly

console.log('🚨 EMERGENCY DATABASE FIX - Adding missing columns...');

async function addMissingColumns() {
  try {
    console.log('Adding paypal_email column...');
    
    // Use Supabase RPC to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS paypal_email TEXT,
        ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'independent',
        ADD COLUMN IF NOT EXISTS business_name TEXT,
        ADD COLUMN IF NOT EXISTS website_url TEXT,
        ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
      `
    });

    if (error) {
      console.error('❌ RPC method failed:', error);
      console.log('💡 You need to run the SQL manually in Supabase Dashboard');
      return false;
    }

    console.log('✅ Columns added successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('💡 Manual fix required - go to Supabase Dashboard > SQL Editor');
    return false;
  }
}

// Try to add columns
addMissingColumns().then(success => {
  if (success) {
    console.log('🎉 Database fixed! Try saving your PayPal email now.');
  } else {
    console.log('⚠️ Automatic fix failed. Use the workaround for now.');
    console.log('📧 PayPal email will be saved in your bio field temporarily.');
  }
});