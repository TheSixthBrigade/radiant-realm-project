-- Fix Sales and Whitelist RLS Policies
-- This migration fixes critical issues:
-- 1. Creators can't see sales of their products (only buyers could see their purchases)
-- 2. Bot whitelist data not persisting properly
-- 3. Sales records not being created properly

-- ============================================
-- FIX 1: Sales Table Schema - Add missing columns
-- ============================================

-- Add seller_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'seller_id') THEN
    ALTER TABLE public.sales ADD COLUMN seller_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'currency') THEN
    ALTER TABLE public.sales ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;
END $$;

-- Add platform_fee column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'platform_fee') THEN
    ALTER TABLE public.sales ADD COLUMN platform_fee DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add seller_amount column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'seller_amount') THEN
    ALTER TABLE public.sales ADD COLUMN seller_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add stripe_payment_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'stripe_payment_id') THEN
    ALTER TABLE public.sales ADD COLUMN stripe_payment_id TEXT;
  END IF;
END $$;

-- Update existing sales to populate seller_id from products
UPDATE public.sales s
SET seller_id = p.creator_id
FROM public.products p
WHERE s.product_id = p.id
AND s.seller_id IS NULL;

-- ============================================
-- FIX 2: Sales Table RLS - Allow creators to see their product sales
-- ============================================

-- Drop ALL existing sales policies
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.sales;
DROP POLICY IF EXISTS "Users can view their purchases and creators can view their sales" ON public.sales;
DROP POLICY IF EXISTS "Sales can be inserted by anyone" ON public.sales;
DROP POLICY IF EXISTS "Allow sales insert" ON public.sales;
DROP POLICY IF EXISTS "Service role full access to sales" ON public.sales;
DROP POLICY IF EXISTS "Allow all operations on sales" ON public.sales;

-- Create comprehensive policy for SELECT
-- Allows: buyers, sellers, and product creators to see sales
CREATE POLICY "Sales viewable by buyers sellers and creators"
ON public.sales
FOR SELECT
USING (
  auth.uid() = buyer_id 
  OR auth.uid() = seller_id
  OR product_id IN (
    SELECT id FROM public.products WHERE creator_id = auth.uid()
  )
  OR auth.role() = 'service_role'
);

-- Allow INSERT for authenticated users and service role (webhooks)
CREATE POLICY "Sales can be inserted"
ON public.sales
FOR INSERT
WITH CHECK (true);

-- Allow UPDATE for service role only
CREATE POLICY "Sales can be updated by service role"
ON public.sales
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- FIX 3: Bot Whitelist Tables RLS - Allow bot to read/write
-- ============================================

-- Fix discord_servers table
DROP POLICY IF EXISTS "Allow all operations on discord_servers" ON discord_servers;
DROP POLICY IF EXISTS "Users can view their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Users can insert their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Users can update their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Users can delete their own servers" ON discord_servers;
DROP POLICY IF EXISTS "Allow public read for discord_servers" ON discord_servers;
DROP POLICY IF EXISTS "Allow public insert for discord_servers" ON discord_servers;
DROP POLICY IF EXISTS "Allow public update for discord_servers" ON discord_servers;

-- Allow anon key (bot) to perform all operations
CREATE POLICY "Allow all operations on discord_servers"
ON discord_servers FOR ALL
USING (true)
WITH CHECK (true);

-- Fix bot_products table
DROP POLICY IF EXISTS "Allow all operations on bot_products" ON bot_products;
DROP POLICY IF EXISTS "Users can view products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can insert products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can update products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Users can delete products in their servers" ON bot_products;
DROP POLICY IF EXISTS "Allow public read for bot_products" ON bot_products;
DROP POLICY IF EXISTS "Allow public insert for bot_products" ON bot_products;
DROP POLICY IF EXISTS "Allow public update for bot_products" ON bot_products;
DROP POLICY IF EXISTS "Allow public delete for bot_products" ON bot_products;

CREATE POLICY "Allow all operations on bot_products"
ON bot_products FOR ALL
USING (true)
WITH CHECK (true);

-- Fix bot_whitelisted_users table
DROP POLICY IF EXISTS "Allow all operations on bot_whitelisted_users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Users can view whitelisted users in their products" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Users can insert whitelisted users in their products" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Users can update whitelisted users in their products" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Users can delete whitelisted users in their products" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Allow public read for bot_whitelisted_users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Allow public insert for bot_whitelisted_users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Allow public update for bot_whitelisted_users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Allow public delete for bot_whitelisted_users" ON bot_whitelisted_users;

CREATE POLICY "Allow all operations on bot_whitelisted_users"
ON bot_whitelisted_users FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX 4: Developer API Tables RLS
-- ============================================

-- Fix developer_products table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'developer_products') THEN
    DROP POLICY IF EXISTS "Allow all operations on developer_products" ON developer_products;
    CREATE POLICY "Allow all operations on developer_products"
    ON developer_products FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Fix whitelist_entries table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whitelist_entries') THEN
    DROP POLICY IF EXISTS "Allow all operations on whitelist_entries" ON whitelist_entries;
    CREATE POLICY "Allow all operations on whitelist_entries"
    ON whitelist_entries FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- FIX 5: Ensure proper indexes exist
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer_id ON public.sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_whitelisted_users_product_id ON bot_whitelisted_users(product_id);
CREATE INDEX IF NOT EXISTS idx_bot_whitelisted_users_discord_id ON bot_whitelisted_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_bot_products_server_id ON bot_products(server_id);
CREATE INDEX IF NOT EXISTS idx_bot_products_roblox_group_id ON bot_products(roblox_group_id);

-- ============================================
-- VERIFICATION: Check that policies are correct
-- ============================================
-- Run this to verify: SELECT * FROM pg_policies WHERE tablename IN ('sales', 'discord_servers', 'bot_products', 'bot_whitelisted_users');
