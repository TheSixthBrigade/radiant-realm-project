-- Create table to track platform fees owed by sellers
-- Fees are collected periodically (weekly/monthly) like Payhip

CREATE TABLE IF NOT EXISTS platform_fees_owed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  amount_owed DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, collected, waived
  collected_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller 
ON platform_fees_owed(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_fees_status 
ON platform_fees_owed(status, created_at);

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

-- Enable RLS
ALTER TABLE platform_fees_owed ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_fees_owed' 
    AND policyname = 'Sellers can view their own fees'
  ) THEN
    CREATE POLICY "Sellers can view their own fees"
    ON platform_fees_owed FOR SELECT
    USING (auth.uid() = seller_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_fees_owed' 
    AND policyname = 'Platform can manage all fees'
  ) THEN
    CREATE POLICY "Platform can manage all fees"
    ON platform_fees_owed FOR ALL
    USING (true); -- You'll want to restrict this to admin users
  END IF;
END $$;

COMMENT ON TABLE platform_fees_owed IS 
  'Tracks platform fees owed by sellers. Fees are collected periodically (weekly/monthly) to avoid payment holds.';
