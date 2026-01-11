-- Fix payment_transactions table to add missing columns
-- These columns are needed for the Stripe Connect integration

-- Add payment_method column if it doesn't exist
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
-- Add payout_status column if it doesn't exist  
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';
-- Add stripe_session_id column if it doesn't exist
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
-- Add paypal_transaction_id column if it doesn't exist (for PayPal payments)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT;
-- Add updated_at column if it doesn't exist
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method 
ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payout_status 
ON payment_transactions(payout_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session_id 
ON payment_transactions(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;
-- Add comments to explain the columns
COMMENT ON COLUMN payment_transactions.payment_method IS 'Payment method used: stripe, paypal';
COMMENT ON COLUMN payment_transactions.payout_status IS 'Payout status: instant_split, pending, completed';
COMMENT ON COLUMN payment_transactions.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN payment_transactions.paypal_transaction_id IS 'PayPal transaction ID';
-- Update existing records to have proper payment_method
UPDATE payment_transactions 
SET payment_method = 'stripe' 
WHERE payment_method IS NULL AND stripe_payment_intent_id IS NOT NULL;
UPDATE payment_transactions 
SET payment_method = 'paypal' 
WHERE payment_method IS NULL AND paypal_transaction_id IS NOT NULL;
-- Set default payout_status for existing records
UPDATE payment_transactions 
SET payout_status = 'instant_split' 
WHERE payout_status IS NULL OR payout_status = '';
-- Show the updated structure
SELECT 'Payment transactions table updated successfully!' as status;
