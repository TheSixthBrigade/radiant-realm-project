-- Create obfuscation_usage table to track daily usage
CREATE TABLE IF NOT EXISTS obfuscation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES developer_api_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credit_used BOOLEAN DEFAULT FALSE -- true if credit was used instead of tier allowance
);

-- Index for fast daily usage queries
CREATE INDEX IF NOT EXISTS idx_obfuscation_usage_developer_date 
ON obfuscation_usage(developer_id, created_at DESC);

-- RLS policies
ALTER TABLE obfuscation_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own obfuscation usage"
ON obfuscation_usage FOR SELECT
TO authenticated
USING (developer_id = auth.uid());

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert obfuscation usage"
ON obfuscation_usage FOR INSERT
TO service_role
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON obfuscation_usage TO authenticated;
GRANT ALL ON obfuscation_usage TO service_role;
