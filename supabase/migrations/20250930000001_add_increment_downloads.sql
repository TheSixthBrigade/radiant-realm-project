-- Helper function to increment product downloads
CREATE OR REPLACE FUNCTION increment_downloads(product_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET downloads = COALESCE(downloads, 0) + 1
  WHERE id = product_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
