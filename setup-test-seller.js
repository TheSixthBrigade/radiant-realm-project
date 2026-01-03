// Set up a test seller with YOUR Stripe account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Setting Up Test Seller Account\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 To test Stripe payments properly, you need to:');
console.log('');
console.log('1️⃣ Go to your Stripe Dashboard:');
console.log('   https://dashboard.stripe.com/test/connect/accounts/create');
console.log('');
console.log('2️⃣ Create a test connected account:');
console.log('   • Click "Create account"');
console.log('   • Choose "Express" account type');
console.log('   • Fill in test information');
console.log('   • Complete the onboarding');
console.log('');
console.log('3️⃣ Copy the account ID (starts with "acct_")');
console.log('');
console.log('4️⃣ Run this command to set it for your test user:');
console.log('   (Replace YOUR_ACCOUNT_ID with the actual ID)');
console.log('');
console.log('   UPDATE profiles');
console.log('   SET stripe_connect_account_id = \'YOUR_ACCOUNT_ID\',');
console.log('       stripe_connect_status = \'connected\'');
console.log('   WHERE display_name = \'rangecluub\';');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('💡 OR, for a quicker test:');
console.log('   Just buy from "John" - their account seems to be valid!');
console.log('   Try purchasing: "Coastal" ($0.50) or "The Strip" ($16.99)');