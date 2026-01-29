-- Fix security definer view - use correct table name
DROP VIEW IF EXISTS public.seller_fees_summary;

-- Recreate as SECURITY INVOKER (default, safer)
CREATE OR REPLACE VIEW public.seller_fees_summary AS
SELECT 
  p.user_id as seller_id,
  pr.display_name as seller_name,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(t.platform_fee), 0) as total_platform_fees,
  COALESCE(SUM(t.seller_amount), 0) as total_seller_earnings
FROM profiles p
LEFT JOIN products prod ON prod.creator_id = p.user_id
LEFT JOIN payment_transactions t ON t.product_id = prod.id AND t.status = 'completed'
LEFT JOIN profiles pr ON pr.user_id = p.user_id
GROUP BY p.user_id, pr.display_name;

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.increment_downloads(product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE products SET downloads = downloads + 1 WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;;
