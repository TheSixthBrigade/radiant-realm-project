const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cmmeqzkbiiqqfvzkmkzt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwNzI2NCwiZXhwIjoyMDc0NDgzMjY0fQ.YOUR_SERVICE_ROLE_KEY'
);

async function checkTable() {
  const { data, error } = await supabase.from('obfuscation_usage').select('id').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('Table does not exist - please create it via Supabase SQL Editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS obfuscation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES developer_api_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credit_used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_obfuscation_usage_developer_date 
ON obfuscation_usage(developer_id, created_at DESC);

ALTER TABLE obfuscation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own obfuscation usage"
ON obfuscation_usage FOR SELECT
TO authenticated
USING (developer_id = auth.uid());

CREATE POLICY "Service role can insert obfuscation usage"
ON obfuscation_usage FOR INSERT
TO service_role
WITH CHECK (true);
      `);
    } else {
      console.log('Error:', error.message);
    }
  } else {
    console.log('Table exists!');
  }
}

checkTable();
