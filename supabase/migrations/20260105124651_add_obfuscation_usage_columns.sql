-- Add missing columns to obfuscation_usage
ALTER TABLE obfuscation_usage ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES developer_api_keys(id) ON DELETE SET NULL;
ALTER TABLE obfuscation_usage ADD COLUMN IF NOT EXISTS credit_used BOOLEAN DEFAULT FALSE;

-- Rename used_at to created_at if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'obfuscation_usage' AND column_name = 'used_at') THEN
    ALTER TABLE obfuscation_usage RENAME COLUMN used_at TO created_at;
  END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_obfuscation_usage_developer_date 
ON obfuscation_usage(developer_id, created_at DESC);;
