-- Drop the restrictive select policy
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "Allow all sales read" ON public.sales;

-- Create a proper policy that allows:
-- 1. Buyers to see their own purchases
-- 2. Creators to see sales of their products
CREATE POLICY "sales_select_for_buyers_and_creators" ON public.sales
FOR SELECT USING (
  buyer_id = auth.uid()
  OR
  product_id IN (
    SELECT id FROM public.products WHERE creator_id = auth.uid()
  )
);;
