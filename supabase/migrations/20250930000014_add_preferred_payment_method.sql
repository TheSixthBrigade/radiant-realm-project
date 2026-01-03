-- Add preferred_payment_method column to profiles table
-- This allows sellers to choose their preferred payment method when both PayPal and Stripe are connected

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'paypal';

-- Add comment to explain the column
COMMENT ON COLUMN profiles.preferred_payment_method IS 'Seller preferred payment method: paypal or stripe';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_payment_method ON profiles(preferred_payment_method);
