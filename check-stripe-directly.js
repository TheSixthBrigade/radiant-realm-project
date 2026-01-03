// Direct Stripe API check for recent payments
console.log('🔍 How to Check Payment Splits in Stripe Test Dashboard\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 STEP-BY-STEP VERIFICATION GUIDE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n1️⃣ CHECK THE PAYMENT:');
console.log('   🌐 Go to: https://dashboard.stripe.com/test/payments');
console.log('   👀 Look for the most recent payment');
console.log('   💰 It should show the full amount (e.g., $0.50)');
console.log('   🔍 Click on the payment to see details');

console.log('\n2️⃣ VERIFY THE APPLICATION FEE:');
console.log('   📊 In the payment details, look for "Application fee"');
console.log('   🏪 This is YOUR 5% commission');
console.log('   ✅ Should be 5% of the total (e.g., $0.025 for a $0.50 purchase)');

console.log('\n3️⃣ CHECK THE TRANSFER TO SELLER:');
console.log('   💸 Look for "Transfer" section in the payment');
console.log('   👤 This shows money going to the seller\'s connected account');
console.log('   ✅ Should be 95% of total (e.g., $0.475 for a $0.50 purchase)');

console.log('\n4️⃣ VERIFY CONNECTED ACCOUNT BALANCE:');
console.log('   🌐 Go to: https://dashboard.stripe.com/test/connect/accounts');
console.log('   👤 Click on the seller\'s connected account');
console.log('   💰 Check their "Available balance"');
console.log('   ✅ Should show the 95% amount');

console.log('\n5️⃣ CHECK YOUR PLATFORM BALANCE:');
console.log('   🌐 Go to: https://dashboard.stripe.com/test/balance');
console.log('   🏪 Your "Available balance" should show the 5% commission');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST MODE NOTES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• 💳 All payments use test card: 4242 4242 4242 4242');
console.log('• 🚫 No real money is processed');
console.log('• ⚡ Transactions appear instantly in dashboard');
console.log('• 🔄 Webhooks might take 10-30 seconds to process');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 WHAT YOU SHOULD SEE:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('If you bought a $0.50 product:');
console.log('• 💵 Payment: $0.50 total');
console.log('• 🏪 Your commission: $0.025 (5%)');
console.log('• 👤 Seller gets: $0.475 (95%)');
console.log('• ✅ Both amounts should appear in respective accounts');

console.log('\n🚀 The payment split is working if you see these amounts!');