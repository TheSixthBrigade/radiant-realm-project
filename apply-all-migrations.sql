-- Apply All Pending Migrations
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"

-- ============================================
-- Migration 1: Performance Indexes
-- ============================================

-- Add performance indexes for slow queries
CREATE INDEX IF NOT EXISTS idx_products_creator_created 
ON products(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_creator_id 
ON products(creator_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_creator_created 
ON orders(creator_id, created_at DESC) 
WHERE creator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_created 
ON orders(buyer_id, created_at DESC) 
WHERE buyer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_sections_page_position 
ON page_sections(page_id, position);

CREATE INDEX IF NOT EXISTS idx_collections_creator_id 
ON collections(creator_id);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id 
ON collection_products(collection_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_creator_id 
ON newsletter_subscribers(creator_id);

ANALYZE products;
ANALYZE profiles;
ANALYZE orders;
ANALYZE page_sections;
ANALYZE collections;
ANALYZE collection_products;
ANALYZE newsletter_subscribers;

-- ============================================
-- Migration 2: PayPal & Stripe Fields
-- ============================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant ON profiles(paypal_merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON payment_transactions(payment_provider);

-- Update existing transactions
UPDATE payment_transactions 
SET 
  platform_fee = amount * 0.05,
  seller_amount = amount * 0.95
WHERE platform_fee IS NULL OR platform_fee = 0;

-- ============================================
-- Migration 3: Instant Payment Split
-- ============================================

-- Update payout_status column type
ALTER TABLE payment_transactions 
  ALTER COLUMN payout_status TYPE TEXT;

-- Add comment
COMMENT ON COLUMN payment_transactions.payout_status IS 
  'instant_split = Payment split at checkout (no hold), completed = Manual payout sent, pending = Awaiting payout';

-- Update existing pending transactions
UPDATE payment_transactions 
SET payout_status = 'pending'
WHERE payout_status IS NULL OR payout_status = '';

-- Create function to increment downloads
CREATE OR REPLACE FUNCTION increment_downloads(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET downloads = downloads + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for webhook processing
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id 
ON payment_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status, payout_status);

-- ============================================
-- All Migrations Applied Successfully! ✅
-- ============================================

SELECT 'All migrations applied successfully!' AS status;
