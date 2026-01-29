-- CLEANUP: More duplicate policies

-- ============================================
-- USER_ROLES - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;

-- Create clean policy with optimized auth call
CREATE POLICY "user_roles_access" ON user_roles FOR SELECT USING (
  user_id = (select auth.uid()) OR 
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);
CREATE POLICY "user_roles_admin_manage" ON user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);

-- ============================================
-- COMMISSION_OVERRIDES - Clean up duplicates
-- ============================================
DROP POLICY IF EXISTS "Admins can manage commission overrides" ON commission_overrides;
DROP POLICY IF EXISTS "Store owners can view their commission rate" ON commission_overrides;
DROP POLICY IF EXISTS "commission_overrides_select" ON commission_overrides;
DROP POLICY IF EXISTS "commission_overrides_manage" ON commission_overrides;

-- Create clean policy
CREATE POLICY "commission_overrides_access" ON commission_overrides FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = commission_overrides.store_id AND stores.user_id = (select auth.uid())) OR
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);
CREATE POLICY "commission_overrides_admin" ON commission_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin')
);;
