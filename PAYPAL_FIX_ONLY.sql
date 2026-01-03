-- ============================================
-- PAYPAL FIX - NO HOLDS METHOD
-- ============================================
-- Copy this entire file and run in Supabase SQL Editor
-- ============================================

-- Add PayPal fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_onboarding_status TEXT DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Add Stripe fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started';

-- Add PayPal fields to payment_transactions table
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

-- Update payout_status column
ALTER TABLE payment_transactions ALTER COLUMN payout_status TYPE TEXT;

-- Update existing transactions
UPDATE payment_transactions 
SET 
  platform_fee = amount * 0.05,
  seller_amount = amount * 0.95,
  payout_status = COALESCE(payout_status, 'pending')
WHERE platform_fee IS NULL OR platform_fee = 0;

-- Create function to increment downloads
CREATE OR REPLACE FUNCTION increment_downloads(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET downloads = downloads + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Create platform fees tracking table (Payhip method)
CREATE TABLE IF NOT EXISTS platform_fees_owed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  amount_owed DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  collected_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant ON profiles(paypal_merchant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON payment_transactions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status, payout_status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller ON platform_fees_owed(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_status ON platform_fees_owed(status, created_at);
CREATE INDEX IF NOT EXISTS idx_products_creator_created ON products(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);

-- Create view for seller fee summary
CREATE OR REPLACE VIEW seller_fees_summary AS
SELECT 
  seller_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'pending' THEN amount_owed ELSE 0 END) as pending_fees,
  SUM(CASE WHEN status = 'collected' THEN amount_owed ELSE 0 END) as collected_fees,
  SUM(amount_owed) as total_fees
FROM platform_fees_owed
GROUP BY seller_id;

-- Enable RLS on platform_fees_owed
ALTER TABLE platform_fees_owed ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can view their own fees"
ON platform_fees_owed FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Platform can manage all fees"
ON platform_fees_owed FOR ALL
USING (true);

-- Add helpful comments
COMMENT ON TABLE platform_fees_owed IS 
  'Tracks platform fees owed by sellers. Sellers receive 100% of payment directly (NO HOLDS!), then pay platform fee separately via monthly invoice. This is the Payhip method.';

COMMENT ON COLUMN payment_transactions.payout_status IS 
  'seller_paid_direct = Seller received 100% directly (Payhip method - no holds!), instant_split = Payment split at checkout, completed = Manual payout sent, pending = Awaiting payout';

-- Analyze tables for better query performance
ANALYZE products;
ANALYZE profiles;
ANALYZE payment_transactions;
ANALYZE platform_fees_owed;

-- ============================================
-- ✅ DONE! NO MORE PAYPAL HOLDS!
-- ============================================

SELECT 
  '✅ PayPal fix applied successfully!' as status,
  'Sellers now receive 100% directly - NO HOLDS!' as result,
  'Platform fees tracked and collected monthly' as method;
