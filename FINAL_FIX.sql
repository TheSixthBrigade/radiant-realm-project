-- ============================================
-- PAYPAL FIX - FINAL VERSION THAT WORKS
-- ============================================
-- This adds ONLY what's needed for PayPal with no holds
-- ============================================

-- 1. Add PayPal fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_onboarding_status TEXT DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started';

-- 2. Add missing fields to payment_transactions (if they don't exist)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payout_batch_id TEXT;

-- 3. Make stripe_payment_intent_id nullable (for PayPal payments)
ALTER TABLE payment_transactions ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;

-- 4. Update existing transactions to have proper values
UPDATE payment_transactions 
SET 
  platform_fee = COALESCE(platform_fee, amount * 0.05),
  seller_amount = COALESCE(seller_amount, amount * 0.95),
  payout_status = COALESCE(payout_status, 'pending')
WHERE platform_fee = 0 OR seller_amount = 0;

-- 5. Create increment_downloads function
DROP FUNCTION IF EXISTS increment_downloads(uuid);
CREATE FUNCTION increment_downloads(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET downloads = downloads + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create platform_fees_owed table (Payhip method)
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

-- 7. Create essential indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON profiles(paypal_email);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller ON platform_fees_owed(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);

-- 8. Create view for fee tracking
CREATE OR REPLACE VIEW seller_fees_summary AS
SELECT 
  seller_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'pending' THEN amount_owed ELSE 0 END) as pending_fees,
  SUM(CASE WHEN status = 'collected' THEN amount_owed ELSE 0 END) as collected_fees,
  SUM(amount_owed) as total_fees
FROM platform_fees_owed
GROUP BY seller_id;

-- 9. Enable RLS and create policies
ALTER TABLE platform_fees_owed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view their own fees" ON platform_fees_owed;
CREATE POLICY "Sellers can view their own fees"
ON platform_fees_owed FOR SELECT
USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Platform can manage all fees" ON platform_fees_owed;
CREATE POLICY "Platform can manage all fees"
ON platform_fees_owed FOR ALL
USING (true);

-- 10. Add helpful comments
COMMENT ON TABLE platform_fees_owed IS 
  'Payhip Method: Sellers receive 100% directly (NO HOLDS!), platform fees collected monthly via invoice';

COMMENT ON COLUMN payment_transactions.payout_status IS 
  'seller_paid_direct = Seller got 100% directly (no holds), pending = awaiting payout, completed = payout sent';

-- ============================================
-- ✅ SUCCESS!
-- ============================================

SELECT 
  '✅ PayPal fix complete!' as status,
  'Sellers receive 100% directly' as method,
  'NO MORE HOLDS!' as result;
