-- Add INSERT policy for obfuscation_usage
CREATE POLICY "Users can insert own usage"
  ON obfuscation_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (developer_id = auth.uid());;
