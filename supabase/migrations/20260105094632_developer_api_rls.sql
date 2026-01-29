-- RLS policies for Developer API tables

-- Enable RLS on all tables
ALTER TABLE developer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE obfuscation_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE obfuscation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- API Keys: developers can manage their own keys
CREATE POLICY "Users can view own api keys"
  ON developer_api_keys FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Users can create own api keys"
  ON developer_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Users can update own api keys"
  ON developer_api_keys FOR UPDATE
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Users can delete own api keys"
  ON developer_api_keys FOR DELETE
  TO authenticated
  USING (developer_id = auth.uid());

-- Subscriptions: read own, service role manages
CREATE POLICY "Users can view own subscription"
  ON developer_subscriptions FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Credits: read own, service role manages
CREATE POLICY "Users can view own credits"
  ON obfuscation_credits FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Usage: read own
CREATE POLICY "Users can view own usage"
  ON obfuscation_usage FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Products: full CRUD for own products
CREATE POLICY "Users can view own products"
  ON developer_products FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Users can create own products"
  ON developer_products FOR INSERT
  TO authenticated
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Users can update own products"
  ON developer_products FOR UPDATE
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Users can delete own products"
  ON developer_products FOR DELETE
  TO authenticated
  USING (developer_id = auth.uid());

-- Whitelist: access through product ownership
CREATE POLICY "Users can view whitelist for own products"
  ON whitelist_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_products
      WHERE developer_products.id = whitelist_entries.product_id
      AND developer_products.developer_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to whitelist for own products"
  ON whitelist_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM developer_products
      WHERE developer_products.id = whitelist_entries.product_id
      AND developer_products.developer_id = auth.uid()
    )
  );

CREATE POLICY "Users can update whitelist for own products"
  ON whitelist_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_products
      WHERE developer_products.id = whitelist_entries.product_id
      AND developer_products.developer_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from whitelist for own products"
  ON whitelist_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_products
      WHERE developer_products.id = whitelist_entries.product_id
      AND developer_products.developer_id = auth.uid()
    )
  );

-- API Logs: read own
CREATE POLICY "Users can view own api logs"
  ON api_request_logs FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Public verification endpoint needs to read whitelist and products
CREATE POLICY "Public can verify whitelist status"
  ON whitelist_entries FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read products for verification"
  ON developer_products FOR SELECT
  TO anon
  USING (true);;
