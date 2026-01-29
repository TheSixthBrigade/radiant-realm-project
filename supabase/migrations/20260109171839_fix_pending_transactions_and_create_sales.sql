-- First, update all pending transactions to completed
UPDATE payment_transactions 
SET status = 'completed', updated_at = NOW()
WHERE status = 'pending';

-- Create sales records for all completed transactions that don't have sales yet
INSERT INTO sales (product_id, buyer_id, amount, created_at)
SELECT 
  pt.product_id,
  pt.buyer_id,
  pt.amount,
  pt.created_at
FROM payment_transactions pt
LEFT JOIN sales s ON s.product_id = pt.product_id AND s.created_at = pt.created_at
WHERE pt.status = 'completed' AND s.id IS NULL;

-- Update download counts for products with sales
UPDATE products p
SET downloads = (
  SELECT COUNT(*) FROM sales s WHERE s.product_id = p.id
)
WHERE id IN (SELECT DISTINCT product_id FROM sales);;
