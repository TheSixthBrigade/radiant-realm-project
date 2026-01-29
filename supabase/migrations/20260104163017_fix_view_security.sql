-- Force drop the view completely
DROP VIEW IF EXISTS public.seller_fees_summary CASCADE;

-- Recreate without SECURITY DEFINER (SECURITY INVOKER is default)
CREATE VIEW public.seller_fees_summary 
WITH (security_invoker = true)
AS
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
GROUP BY p.user_id, pr.display_name;;
