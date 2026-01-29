-- Add UPDATE policy for obfuscation_credits
CREATE POLICY "Users can update own credits"
  ON obfuscation_credits
  FOR UPDATE
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());;
