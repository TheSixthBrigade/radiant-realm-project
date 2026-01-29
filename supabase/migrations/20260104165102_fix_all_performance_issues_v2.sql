-- =====================================================
-- FIX ALL REMAINING PERFORMANCE ISSUES
-- =====================================================

-- PART 1: Add missing indexes for foreign keys
-- =====================================================

-- announcements.admin_id
CREATE INDEX IF NOT EXISTS idx_announcements_admin_id ON public.announcements(admin_id);

-- commission_overrides.created_by
CREATE INDEX IF NOT EXISTS idx_commission_overrides_created_by ON public.commission_overrides(created_by);

-- email_queue.campaign_id
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON public.email_queue(campaign_id);

-- newsletter_campaigns.product_id
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_product_id ON public.newsletter_campaigns(product_id);

-- payment_transactions.product_id
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON public.payment_transactions(product_id);

-- payment_transactions.store_id
CREATE INDEX IF NOT EXISTS idx_payment_transactions_store_id ON public.payment_transactions(store_id);

-- platform_fees_owed.transaction_id
CREATE INDEX IF NOT EXISTS idx_platform_fees_owed_transaction_id ON public.platform_fees_owed(transaction_id);

-- products.store_id
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

-- sales.buyer_id
CREATE INDEX IF NOT EXISTS idx_sales_buyer_id ON public.sales(buyer_id);

-- sales.product_id
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);

-- store_products.product_id
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON public.store_products(product_id);

-- PART 2: Fix multiple permissive policies by consolidating them
-- =====================================================

-- 2.1 ANNOUNCEMENTS - consolidate announcements_admin_manage + announcements_public_view
DROP POLICY IF EXISTS announcements_admin_manage ON public.announcements;
DROP POLICY IF EXISTS announcements_public_view ON public.announcements;
DROP POLICY IF EXISTS announcements_select ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY announcements_admin_insert ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY announcements_admin_update ON public.announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY announcements_admin_delete ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 2.2 COLLECTION_PRODUCTS - consolidate collection_products_owner + collection_products_view
DROP POLICY IF EXISTS collection_products_owner ON public.collection_products;
DROP POLICY IF EXISTS collection_products_view ON public.collection_products;
DROP POLICY IF EXISTS collection_products_select ON public.collection_products;

CREATE POLICY collection_products_select ON public.collection_products
  FOR SELECT USING (true);

CREATE POLICY collection_products_owner_insert ON public.collection_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY collection_products_owner_update ON public.collection_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY collection_products_owner_delete ON public.collection_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = auth.uid()
    )
  );

-- 2.3 COMMISSION_OVERRIDES - consolidate commission_overrides_access + commission_overrides_admin
DROP POLICY IF EXISTS commission_overrides_access ON public.commission_overrides;
DROP POLICY IF EXISTS commission_overrides_admin ON public.commission_overrides;
DROP POLICY IF EXISTS commission_overrides_select ON public.commission_overrides;

CREATE POLICY commission_overrides_select ON public.commission_overrides
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_insert ON public.commission_overrides
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_update ON public.commission_overrides
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_delete ON public.commission_overrides
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 2.4 FOLLOWS - consolidate "Users can view all follows" + follows_view
DROP POLICY IF EXISTS "Users can view all follows" ON public.follows;
DROP POLICY IF EXISTS follows_view ON public.follows;
DROP POLICY IF EXISTS follows_select ON public.follows;

CREATE POLICY follows_select ON public.follows
  FOR SELECT USING (true);

-- 2.5 PRODUCT_COLLECTIONS - consolidate product_collections_owner + product_collections_view
DROP POLICY IF EXISTS product_collections_owner ON public.product_collections;
DROP POLICY IF EXISTS product_collections_view ON public.product_collections;
DROP POLICY IF EXISTS product_collections_select ON public.product_collections;

CREATE POLICY product_collections_select ON public.product_collections
  FOR SELECT USING (true);

CREATE POLICY product_collections_owner_insert ON public.product_collections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY product_collections_owner_update ON public.product_collections
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY product_collections_owner_delete ON public.product_collections
  FOR DELETE USING (user_id = auth.uid());

-- 2.6 STORE_PRODUCTS - consolidate store_products_owner_manage + store_products_view
DROP POLICY IF EXISTS store_products_owner_manage ON public.store_products;
DROP POLICY IF EXISTS store_products_view ON public.store_products;
DROP POLICY IF EXISTS store_products_select ON public.store_products;

CREATE POLICY store_products_select ON public.store_products
  FOR SELECT USING (true);

CREATE POLICY store_products_owner_insert ON public.store_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = auth.uid())
  );

CREATE POLICY store_products_owner_update ON public.store_products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = auth.uid())
  );

CREATE POLICY store_products_owner_delete ON public.store_products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = auth.uid())
  );

-- 2.7 USER_ROLES - consolidate user_roles_access + user_roles_admin_manage
DROP POLICY IF EXISTS user_roles_access ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );;
