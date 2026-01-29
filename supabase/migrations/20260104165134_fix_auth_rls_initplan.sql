-- =====================================================
-- FIX AUTH RLS INITPLAN - Use (select auth.uid()) pattern
-- =====================================================

-- 1. ANNOUNCEMENTS
DROP POLICY IF EXISTS announcements_admin_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_update ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_delete ON public.announcements;

CREATE POLICY announcements_admin_insert ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY announcements_admin_update ON public.announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY announcements_admin_delete ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- 2. COLLECTION_PRODUCTS
DROP POLICY IF EXISTS collection_products_owner_insert ON public.collection_products;
DROP POLICY IF EXISTS collection_products_owner_update ON public.collection_products;
DROP POLICY IF EXISTS collection_products_owner_delete ON public.collection_products;

CREATE POLICY collection_products_owner_insert ON public.collection_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = (select auth.uid())
    )
  );

CREATE POLICY collection_products_owner_update ON public.collection_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = (select auth.uid())
    )
  );

CREATE POLICY collection_products_owner_delete ON public.collection_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.product_collections pc
      WHERE pc.id = collection_id AND pc.user_id = (select auth.uid())
    )
  );

-- 3. COMMISSION_OVERRIDES
DROP POLICY IF EXISTS commission_overrides_select ON public.commission_overrides;
DROP POLICY IF EXISTS commission_overrides_admin_insert ON public.commission_overrides;
DROP POLICY IF EXISTS commission_overrides_admin_update ON public.commission_overrides;
DROP POLICY IF EXISTS commission_overrides_admin_delete ON public.commission_overrides;

CREATE POLICY commission_overrides_select ON public.commission_overrides
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_insert ON public.commission_overrides
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_update ON public.commission_overrides
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY commission_overrides_admin_delete ON public.commission_overrides
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- 4. PRODUCT_COLLECTIONS
DROP POLICY IF EXISTS product_collections_owner_insert ON public.product_collections;
DROP POLICY IF EXISTS product_collections_owner_update ON public.product_collections;
DROP POLICY IF EXISTS product_collections_owner_delete ON public.product_collections;

CREATE POLICY product_collections_owner_insert ON public.product_collections
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY product_collections_owner_update ON public.product_collections
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY product_collections_owner_delete ON public.product_collections
  FOR DELETE USING (user_id = (select auth.uid()));

-- 5. STORE_PRODUCTS
DROP POLICY IF EXISTS store_products_owner_insert ON public.store_products;
DROP POLICY IF EXISTS store_products_owner_update ON public.store_products;
DROP POLICY IF EXISTS store_products_owner_delete ON public.store_products;

CREATE POLICY store_products_owner_insert ON public.store_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = (select auth.uid()))
  );

CREATE POLICY store_products_owner_update ON public.store_products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = (select auth.uid()))
  );

CREATE POLICY store_products_owner_delete ON public.store_products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND user_id = (select auth.uid()))
  );

-- 6. USER_ROLES
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
  );

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );;
