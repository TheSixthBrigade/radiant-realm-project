-- ============================================
-- COMPLETE PAYPAL FIX - RUN THIS ENTIRE FILE
-- ============================================
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" - that's it!
-- ============================================

-- ============================================
-- 1. Performance Indexes (makes everything faster)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_creator_created 
ON products(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_creator_id 
ON products(creator_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_collections_creator_id 
ON collections(creator_id);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id 
ON collection_products(collection_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_creator_id 
ON newsletter_subscribers(creator_id);

ANALYZE products;
ANALYZE profiles;
ANALYZE collections;
ANALYZE collection_products;
ANALYZE newsletter_subscribers;

-- ============================================
-- 2. PayPal & Stripe Fields
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_onboarding_status TEXT DEFAULT 'not_started';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started';

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant ON profiles(paypal_merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON payment_transactions(payment_provider);

UPDATE payment_transactions 
SET 
  platform_fee = amount * 0.05,
  seller_amount = amount * 0.95
WHERE platform_fee IS NULL OR platform_fee = 0;

-- ============================================
-- 3. Payment System Updates
-- ============================================

ALTER TABLE payment_transactions 
  ALTER COLUMN payout_status TYPE TEXT;

COMMENT ON COLUMN payment_transactions.payout_status IS 
  'seller_paid_direct = Seller received 100% directly (Payhip method), instant_split = Payment split at checkout, completed = Manual payout sent, pending = Awaiting payout';

UPDATE payment_transactions 
SET payout_status = 'pending'
WHERE payout_status IS NULL OR payout_status = '';

CREATE OR REPLACE FUNCTION increment_downloads(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET downloads = downloads + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id 
ON payment_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status, payout_status);

-- ============================================
-- 4. Platform Fees Tracking (Payhip Method)
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_platform_fees_seller 
ON platform_fees_owed(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_fees_status 
ON platform_fees_owed(status, created_at);

CREATE OR REPLACE VIEW seller_fees_summary AS
SELECT 
  seller_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'pending' THEN amount_owed ELSE 0 END) as pending_fees,
  SUM(CASE WHEN status = 'collected' THEN amount_owed ELSE 0 END) as collected_fees,
  SUM(amount_owed) as total_fees
FROM platform_fees_owed
GROUP BY seller_id;

ALTER TABLE platform_fees_owed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own fees"
ON platform_fees_owed FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Platform can manage all fees"
ON platform_fees_owed FOR ALL
USING (true);

COMMENT ON TABLE platform_fees_owed IS 
  'Tracks platform fees owed by sellers. Sellers receive 100% of payment directly (no holds!), then pay platform fee separately via monthly invoice. This is the Payhip method.';

-- ============================================
-- ✅ ALL DONE!
-- ============================================

SELECT 
  '✅ All migrations applied successfully!' as status,
  'No more PayPal holds!' as message,
  'Sellers now receive 100% directly' as method,
  'Platform fees collected monthly' as fee_collection;
