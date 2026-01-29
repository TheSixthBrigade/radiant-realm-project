-- CLEANUP: Fix remaining slow RLS policies (auth.uid() -> (select auth.uid()))

-- ============================================
-- STORES - Fix slow policies
-- ============================================
DROP POLICY IF EXISTS "Users can create their own store" ON stores;
DROP POLICY IF EXISTS "Users can update their own store" ON stores;
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON stores;
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_insert" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;

CREATE POLICY "stores_view" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_create" ON stores FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "stores_edit" ON stores FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PAYMENT_TRANSACTIONS - Fix slow policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select" ON payment_transactions;

CREATE POLICY "payment_transactions_view" ON payment_transactions FOR SELECT USING (
  buyer_id = (select auth.uid()) OR seller_id = (select auth.uid())
);

-- ============================================
-- FOLLOWS - Fix slow policies
-- ============================================
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
DROP POLICY IF EXISTS "follows_select" ON follows;
DROP POLICY IF EXISTS "follows_insert" ON follows;
DROP POLICY IF EXISTS "follows_delete" ON follows;

CREATE POLICY "follows_view" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_create" ON follows FOR INSERT WITH CHECK (follower_id = (select auth.uid()));
CREATE POLICY "follows_remove" ON follows FOR DELETE USING (follower_id = (select auth.uid()));;
