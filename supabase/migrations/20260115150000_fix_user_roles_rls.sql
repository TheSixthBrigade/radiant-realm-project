-- Fix user_roles RLS to avoid infinite recursion
-- The problem: user_roles_select policy checks user_roles to see if user is admin
-- This causes infinite recursion and 500 errors

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
DROP POLICY IF EXISTS user_roles_access ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;

-- Create simple non-recursive policies
-- Users can only read their own roles
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- For admin operations, we use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin can insert roles (using the function to check)
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update roles
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE USING (public.is_admin());

-- Admin can delete roles
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE USING (public.is_admin());
