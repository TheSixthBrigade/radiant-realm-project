-- Add INSERT policy for bot_whitelisted_users
CREATE POLICY "Users can add whitelisted users to their products" ON public.bot_whitelisted_users
FOR INSERT WITH CHECK (
  product_id IN (
    SELECT bp.id FROM bot_products bp
    JOIN discord_servers ds ON bp.server_id = ds.id
    WHERE ds.user_id = auth.uid()
  )
);

-- Add UPDATE policy for bot_whitelisted_users
CREATE POLICY "Users can update whitelisted users in their products" ON public.bot_whitelisted_users
FOR UPDATE USING (
  product_id IN (
    SELECT bp.id FROM bot_products bp
    JOIN discord_servers ds ON bp.server_id = ds.id
    WHERE ds.user_id = auth.uid()
  )
);

-- Add DELETE policy for bot_whitelisted_users
CREATE POLICY "Users can delete whitelisted users from their products" ON public.bot_whitelisted_users
FOR DELETE USING (
  product_id IN (
    SELECT bp.id FROM bot_products bp
    JOIN discord_servers ds ON bp.server_id = ds.id
    WHERE ds.user_id = auth.uid()
  )
);;
