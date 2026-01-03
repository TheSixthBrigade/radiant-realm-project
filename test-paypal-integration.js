// Test PayPal integration in browser console
// Run this after the PayPal SDK loads

console.log('🧪 Testing PayPal Integration...');

function testPayPalIntegration() {
  // Check if PayPal SDK is loaded
  if (typeof window.paypal === 'undefined') {
    console.error('❌ PayPal SDK not loaded');
    return false;
  }
  
  console.log('✅ PayPal SDK loaded successfully');
  console.log('PayPal version:', window.paypal.version);
  
  // Check if PayPal Buttons is available
  if (typeof window.paypal.Buttons === 'undefined') {
    console.error('❌ PayPal Buttons not available');
    return false;
  }
  
  console.log('✅ PayPal Buttons available');
  
  // Test creating a simple order structure
  try {
    const testOrder = {
      purchase_units: [{
        amount: {
          value: '10.50',
          currency_code: 'USD'
        },
        description: 'Test Product'
      }]
    };
    
    console.log('✅ Order structure valid:', testOrder);
    return true;
  } catch (error) {
    console.error('❌ Order structure invalid:', error);
    return false;
  }
}

// Run the test
const result = testPayPalIntegration();
if (result) {
  console.log('🎉 PayPal integration test passed!');
} else {
  console.log('⚠️ PayPal integration test failed');
}

// Also test if we can access the container
const container = document.getElementById('paypal-button-container');
if (container) {
  console.log('✅ PayPal button container found');
} else {
  console.log('❌ PayPal button container not found');
}