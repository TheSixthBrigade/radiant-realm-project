// Test script to verify PayPal email saving works
// Run this in browser console after logging in

console.log('🧪 Testing PayPal email save functionality...');

async function testPayPalSave() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not logged in:', userError);
      return false;
    }
    
    console.log('👤 Testing for user:', user.email);
    
    // Test 1: Try to save PayPal email
    console.log('📧 Testing PayPal email save...');
    
    const testEmail = 'test-paypal@example.com';
    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        paypal_email: testEmail,
        display_name: 'Test User'
      }, {
        onConflict: 'user_id'
      });
    
    if (saveError) {
      console.error('❌ Save failed:', saveError);
      console.error('Error details:', saveError.details);
      console.error('Error hint:', saveError.hint);
      return false;
    }
    
    console.log('✅ PayPal email saved successfully!');
    
    // Test 2: Verify the save worked
    console.log('🔍 Verifying save...');
    
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('paypal_email, display_name')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Fetch failed:', fetchError);
      return false;
    }
    
    if (profile.paypal_email === testEmail) {
      console.log('✅ PayPal email verified:', profile.paypal_email);
      return true;
    } else {
      console.error('❌ PayPal email mismatch:', profile.paypal_email, 'vs', testEmail);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testPayPalSave().then(success => {
  if (success) {
    console.log('🎉 All tests passed! PayPal email saving is working.');
  } else {
    console.log('⚠️ Tests failed. Check the database schema.');
  }
});