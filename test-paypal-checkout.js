// Test script to verify PayPal checkout works
// Run this in browser console after saving PayPal email

console.log('🧪 Testing PayPal checkout functionality...');

async function testPayPalCheckout() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not logged in:', userError);
      return false;
    }
    
    console.log('👤 Testing for user:', user.email);
    
    // Check if user's profile has PayPal email in bio
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bio, display_name')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
      return false;
    }
    
    console.log('📄 Profile bio:', profile.bio);
    
    // Extract PayPal email from bio
    let paypalEmail = '';
    if (profile?.bio) {
      const paypalMatch = profile.bio.match(/\[PAYPAL:(.*?)\]/);
      if (paypalMatch) {
        paypalEmail = paypalMatch[1];
      }
    }
    
    if (paypalEmail) {
      console.log('✅ PayPal email found:', paypalEmail);
      console.log('🎉 Checkout should work now!');
      return true;
    } else {
      console.log('❌ No PayPal email found in bio');
      console.log('💡 Make sure you saved your PayPal email in Profile Settings');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testPayPalCheckout().then(success => {
  if (success) {
    console.log('🎉 PayPal checkout should work! Try buying a product now.');
  } else {
    console.log('⚠️ PayPal checkout not ready. Save your PayPal email first.');
  }
});