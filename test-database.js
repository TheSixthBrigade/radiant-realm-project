// Simple test script to verify database functionality
// Run this in the browser console to test

console.log('Testing database functionality...');

// Test 1: Check if we can fetch products
async function testProducts() {
  try {
    console.log('Testing products fetch...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Products test failed:', error);
      return false;
    }
    
    console.log('Products test passed:', data);
    return true;
  } catch (err) {
    console.error('Products test error:', err);
    return false;
  }
}

// Test 2: Check if we can fetch profiles
async function testProfiles() {
  try {
    console.log('Testing profiles fetch...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Profiles test failed:', error);
      return false;
    }
    
    console.log('Profiles test passed:', data);
    return true;
  } catch (err) {
    console.error('Profiles test error:', err);
    return false;
  }
}

// Test 3: Check if the view works
async function testProductsView() {
  try {
    console.log('Testing products_with_creator view...');
    const { data, error } = await supabase
      .from('products_with_creator')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('View test failed:', error);
      return false;
    }
    
    console.log('View test passed:', data);
    return true;
  } catch (err) {
    console.error('View test error:', err);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== DATABASE TESTS ===');
  
  const test1 = await testProducts();
  const test2 = await testProfiles();
  const test3 = await testProductsView();
  
  console.log('=== TEST RESULTS ===');
  console.log('Products:', test1 ? '✅ PASS' : '❌ FAIL');
  console.log('Profiles:', test2 ? '✅ PASS' : '❌ FAIL');
  console.log('View:', test3 ? '✅ PASS' : '❌ FAIL');
  
  if (test1 && test2) {
    console.log('🎉 Basic database functionality is working!');
  } else {
    console.log('⚠️ Database issues detected. Check the migration.');
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runTests();
}