import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('Testing paypal-create-order edge function...\n');
  
  // First, get a real product ID
  const { data: products } = await supabase
    .from('products')
    .select('id, title, creator_id')
    .limit(1);
  
  if (!products || products.length === 0) {
    console.log('No products found. Create a product first.');
    return;
  }
  
  const product = products[0];
  console.log('Testing with product:', product.title);
  console.log('Product ID:', product.id);
  console.log('Creator ID:', product.creator_id);
  
  // Get current user (you need to be logged in)
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('\n❌ Not logged in. Please log in first.');
    return;
  }
  
  console.log('User ID:', user.id);
  console.log('\nCalling edge function...\n');
  
  const { data, error } = await supabase.functions.invoke('paypal-create-order', {
    body: {
      productId: product.id,
      buyerId: user.id
    }
  });
  
  if (error) {
    console.error('❌ Error:', error);
    console.log('\nFull error details:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Success!');
    console.log('Response:', data);
  }
}

testEdgeFunction();
