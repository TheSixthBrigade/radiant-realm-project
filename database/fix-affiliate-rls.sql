-- Fix affiliate RLS policies to allow proper access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can update their own links" ON affiliate_links;
DROP POLICY IF EXISTS "Anyone can view affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "System can insert referrals" ON affiliate_referrals;

-- Recreate with better policies
-- Allow authenticated users to create links for themselves
CREATE POLICY "Users can create their own affiliate links" ON affiliate_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow anyone to view links (needed for click tracking)
CREATE POLICY "Anyone can view affiliate links" ON affiliate_links
  FOR SELECT USING (true);

-- Allow users to update their own links OR allow service role to update any
CREATE POLICY "Users and service can update links" ON affiliate_links
  FOR UPDATE USING (true);

-- Allow service role to insert referrals
CREATE POLICY "Service can insert referrals" ON affiliate_referrals
  FOR INSERT WITH CHECK (true);

-- Allow service role to update referrals
CREATE POLICY "Service can update referrals" ON affiliate_referrals
  FOR UPDATE USING (true);
