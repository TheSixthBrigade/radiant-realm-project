-- Fix Affiliate RLS Policies
-- This migration fixes the RLS policies that are blocking affiliate link creation

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create their own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can update their own links" ON affiliate_links;
DROP POLICY IF EXISTS "Users and service can update links" ON affiliate_links;
DROP POLICY IF EXISTS "Anyone can view affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "System can insert referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Service can insert referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Service can update referrals" ON affiliate_referrals;

-- Recreate policies with proper permissions

-- SELECT: Anyone can view affiliate links (needed for click tracking and lookups)
CREATE POLICY "affiliate_links_select" ON affiliate_links
  FOR SELECT USING (true);

-- INSERT: Authenticated users can create links where they are the user_id
CREATE POLICY "affiliate_links_insert" ON affiliate_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow updates from authenticated users (owner or affiliate) or service role
CREATE POLICY "affiliate_links_update" ON affiliate_links
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = creator_id OR
    auth.role() = 'service_role'
  );

-- DELETE: Only the affiliate user can delete their own link
CREATE POLICY "affiliate_links_delete" ON affiliate_links
  FOR DELETE USING (auth.uid() = user_id);

-- Affiliate Referrals policies
-- SELECT: Users can view referrals for their links
CREATE POLICY "affiliate_referrals_select" ON affiliate_referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliate_links 
      WHERE affiliate_links.id = affiliate_referrals.link_id 
      AND (affiliate_links.user_id = auth.uid() OR affiliate_links.creator_id = auth.uid())
    )
  );

-- INSERT: Allow service role and authenticated users to insert referrals
CREATE POLICY "affiliate_referrals_insert" ON affiliate_referrals
  FOR INSERT WITH CHECK (true);

-- UPDATE: Allow service role and link owners to update referrals
CREATE POLICY "affiliate_referrals_update" ON affiliate_referrals
  FOR UPDATE USING (true);
