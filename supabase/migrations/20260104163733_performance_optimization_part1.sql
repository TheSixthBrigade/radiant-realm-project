-- PART 1: Drop duplicate policies and fix RLS performance
-- This migration optimizes RLS policies by:
-- 1. Using (select auth.uid()) instead of auth.uid() for better performance
-- 2. Consolidating duplicate policies into single policies

-- ============================================
-- PRODUCTS TABLE - Fix duplicate and slow policies
-- ============================================
DROP POLICY IF EXISTS "Creators can insert their own products" ON products;
DROP POLICY IF EXISTS "Creators can update their own products" ON products;
DROP POLICY IF EXISTS "Creators can delete their own products" ON products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;
DROP POLICY IF EXISTS "products_select_public" ON products;

-- Create optimized single policies
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (creator_id = (select auth.uid()));
CREATE POLICY "products_update" ON products FOR UPDATE USING (creator_id = (select auth.uid()));
CREATE POLICY "products_delete" ON products FOR DELETE USING (creator_id = (select auth.uid()));

-- ============================================
-- PROFILES TABLE - Fix duplicate and slow policies  
-- ============================================
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- SALES TABLE - Fix slow policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own purchases" ON sales;
DROP POLICY IF EXISTS "Sales can be inserted by anyone" ON sales;

CREATE POLICY "sales_select" ON sales FOR SELECT USING (buyer_id = (select auth.uid()));
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (true);;
