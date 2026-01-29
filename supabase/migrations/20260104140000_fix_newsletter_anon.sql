-- Fix RLS policy for newsletter_subscribers table - allow anon role
-- The issue is that 'public' role doesn't include 'anon' by default

-- Grant permissions to anon role
GRANT INSERT ON newsletter_subscribers TO anon;
GRANT SELECT ON newsletter_subscribers TO anon;
GRANT UPDATE ON newsletter_subscribers TO anon;
-- Also grant to authenticated users
GRANT INSERT ON newsletter_subscribers TO authenticated;
GRANT SELECT ON newsletter_subscribers TO authenticated;
GRANT UPDATE ON newsletter_subscribers TO authenticated;
-- Drop and recreate policies with explicit anon access
DROP POLICY IF EXISTS "Allow public newsletter subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon newsletter subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon view subscriptions" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow anon update subscriptions" ON newsletter_subscribers;
-- Create policy to allow anon and authenticated to insert
CREATE POLICY "Allow anon newsletter subscriptions"
ON newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
-- Allow anyone to view subscriptions
CREATE POLICY "Allow anon view subscriptions"
ON newsletter_subscribers
FOR SELECT
TO anon, authenticated
USING (true);
-- Allow anyone to update subscriptions (for unsubscribe)
CREATE POLICY "Allow anon update subscriptions"
ON newsletter_subscribers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
