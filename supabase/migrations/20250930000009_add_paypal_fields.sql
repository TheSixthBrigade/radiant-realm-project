-- Add PayPal fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_onboarding_status TEXT DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Add Stripe fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started';

-- Add PayPal fields to payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant ON profiles(paypal_merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON payment_transactions(payment_provider);

-- Update existing transactions to calculate platform fee
UPDATE payment_transactions 
SET 
  platform_fee = amount * 0.05,
  seller_amount = amount * 0.95
WHERE platform_fee IS NULL OR platform_fee = 0;
