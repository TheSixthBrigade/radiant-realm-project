-- Update payment system for instant payment splitting (Payhip-style)
-- No more holds, no more manual payouts - everything happens at checkout

-- Add payout_status values for instant splits
ALTER TABLE payment_transactions 
  ALTER COLUMN payout_status TYPE TEXT;
-- Add comment explaining the new system
COMMENT ON COLUMN payment_transactions.payout_status IS 
  'instant_split = Payment split at checkout (no hold), completed = Manual payout sent, pending = Awaiting payout';
-- Update existing pending transactions
UPDATE payment_transactions 
SET payout_status = 'pending'
WHERE payout_status IS NULL OR payout_status = '';
-- Create function to increment downloads if it doesn't exist
CREATE OR REPLACE FUNCTION increment_downloads(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET downloads = downloads + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;
-- Add index for faster webhook processing
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id 
ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status, payout_status);
