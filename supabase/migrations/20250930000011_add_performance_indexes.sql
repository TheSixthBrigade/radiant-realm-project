-- Add performance indexes for slow queries
-- This migration adds indexes to improve query performance

-- Index for products by creator_id and created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_products_creator_created 
ON products(creator_id, created_at DESC);

-- Index for products created_at for general sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

-- Index for products by creator_id only
CREATE INDEX IF NOT EXISTS idx_products_creator_id 
ON products(creator_id);

-- Index for profiles by user_id (for quick profile lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Index for payment_transactions by seller_id and created_at
CREATE INDEX IF NOT EXISTS idx_payment_transactions_seller_created 
ON payment_transactions(seller_id, created_at DESC) 
WHERE seller_id IS NOT NULL;

-- Index for payment_transactions by buyer_id and created_at
CREATE INDEX IF NOT EXISTS idx_payment_transactions_buyer_created 
ON payment_transactions(buyer_id, created_at DESC) 
WHERE buyer_id IS NOT NULL;

-- Skip optional table indexes - tables may not exist yet

-- Analyze tables to update statistics for query planner
ANALYZE products;
ANALYZE profiles;
ANALYZE payment_transactions;
