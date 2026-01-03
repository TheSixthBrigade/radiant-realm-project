// Run this in browser console to fix database schema issues
// Make sure you're logged in as admin (thecheesemanatyou@gmail.com)

console.log('🔧 Fixing database schema...');

async function fixDatabaseSchema() {
  try {
    // Test if we can connect to Supabase
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to database:', testError);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if creator_type column exists by trying to select it
    const { data: schemaTest, error: schemaError } = await supabase
      .from('profiles')
      .select('creator_type')
      .limit(1);
    
    if (schemaError && schemaError.message.includes('creator_type')) {
      console.log('❌ creator_type column missing - this needs to be fixed in Supabase dashboard');
      console.log('📝 Go to Supabase dashboard > SQL Editor and run the migration');
      return false;
    }
    
    console.log('✅ Schema appears to be correct');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    return false;
  }
}

// Test profile update functionality
async function testProfileUpdate() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ Not logged in');
      return false;
    }
    
    console.log('👤 Testing profile update for user:', user.email);
    
    // Try to update profile with PayPal email
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        paypal_email: 'test@paypal.com',
        creator_type: 'independent'
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('❌ Profile update failed:', error);
      return false;
    }
    
    console.log('✅ Profile update successful');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing profile update:', error);
    return false;
  }
}

// Run the fixes
fixDatabaseSchema().then(schemaOk => {
  if (schemaOk) {
    testProfileUpdate();
  }
});