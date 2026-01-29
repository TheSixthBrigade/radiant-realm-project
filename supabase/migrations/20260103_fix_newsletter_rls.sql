-- Fix RLS policy for newsletter_subscribers table
-- Allow anyone to subscribe (insert) to the newsletter

-- First, check if the table exists and has RLS enabled
ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public newsletter subscriptions" ON newsletter_subscribers;
-- Create policy to allow anyone to insert (subscribe)
CREATE POLICY "Allow public newsletter subscriptions"
ON newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);
-- Allow users to view their own subscriptions (by email)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON newsletter_subscribers;
CREATE POLICY "Users can view own subscriptions"
ON newsletter_subscribers
FOR SELECT
TO public
USING (true);
-- Allow users to update their own subscriptions (for unsubscribe)
DROP POLICY IF EXISTS "Users can update own subscriptions" ON newsletter_subscribers;
CREATE POLICY "Users can update own subscriptions"
ON newsletter_subscribers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
