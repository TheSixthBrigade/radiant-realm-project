-- Enable RLS
ALTER TABLE obfuscation_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own obfuscation usage" ON obfuscation_usage;
DROP POLICY IF EXISTS "Service role can insert obfuscation usage" ON obfuscation_usage;

-- Create policies
CREATE POLICY "Users can view own obfuscation usage"
ON obfuscation_usage FOR SELECT
TO authenticated
USING (developer_id = auth.uid());

-- Grant permissions
GRANT SELECT ON obfuscation_usage TO authenticated;
GRANT ALL ON obfuscation_usage TO service_role;;
