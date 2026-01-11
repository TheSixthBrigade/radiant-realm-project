-- Add Stripe Connect fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'not_started';
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);
