-- Add Stripe Connect fields to profiles table
-- These fields are needed for the marketplace payment system

-- Add Stripe Connect account ID field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
-- Add Stripe Connect status field  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id 
ON profiles(stripe_connect_account_id) 
WHERE stripe_connect_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_status 
ON profiles(stripe_connect_status);
-- Add comment to explain the fields
COMMENT ON COLUMN profiles.stripe_connect_account_id IS 'Stripe Connect account ID for marketplace payments';
COMMENT ON COLUMN profiles.stripe_connect_status IS 'Stripe Connect onboarding status: not_connected, pending, connected';
-- Update existing profiles with old field names if they exist
DO $$ 
BEGIN
  -- Check if old stripe_account_id column exists and migrate data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'stripe_account_id') THEN
    UPDATE profiles 
    SET stripe_connect_account_id = stripe_account_id 
    WHERE stripe_account_id IS NOT NULL AND stripe_connect_account_id IS NULL;
  END IF;

  -- Check if old stripe_onboarding_status column exists and migrate data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_status') THEN
    UPDATE profiles 
    SET stripe_connect_status = 
      CASE 
        WHEN stripe_onboarding_status = 'connected' THEN 'connected'
        WHEN stripe_onboarding_status = 'pending' THEN 'pending'
        ELSE 'not_connected'
      END
    WHERE stripe_onboarding_status IS NOT NULL;
  END IF;
END $$;
