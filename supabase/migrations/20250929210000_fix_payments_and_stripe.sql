-- Fix payment system and add proper Stripe integration

-- Ensure paypal_email column exists in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';

-- Add payment method validation function
CREATE OR REPLACE FUNCTION public.has_payment_method(user_id UUID)
RETURNS BOOLEAN AS $
DECLARE
  profile_record RECORD;
BEGIN
  SELECT paypal_email, stripe_connect_account_id, stripe_connect_status
  INTO profile_record
  FROM profiles
  WHERE profiles.user_id = has_payment_method.user_id;
  
  -- User has payment method if they have PayPal email OR connected Stripe account
  RETURN (
    (profile_record.paypal_email IS NOT NULL AND profile_record.paypal_email != '') OR
    (profile_record.stripe_connect_account_id IS NOT NULL AND profile_record.stripe_connect_status = 'connected')
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get creator payment info
CREATE OR REPLACE FUNCTION public.get_creator_payment_info(creator_user_id UUID)
RETURNS TABLE (
  has_paypal BOOLEAN,
  has_stripe BOOLEAN,
  paypal_email TEXT,
  stripe_account_id TEXT,
  display_name TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    (p.paypal_email IS NOT NULL AND p.paypal_email != '') as has_paypal,
    (p.stripe_connect_account_id IS NOT NULL AND p.stripe_connect_status = 'connected') as has_stripe,
    p.paypal_email,
    p.stripe_connect_account_id,
    p.display_name
  FROM profiles p
  WHERE p.user_id = creator_user_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update payment_transactions table to include more payment methods
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT;

-- Create index for payment method lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON public.profiles(paypal_email) WHERE paypal_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Add RLS policy for admin access to all profiles (for thecheesemanatyou@gmail.com)
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'thecheesemanatyou@gmail.com'
    )
  );

CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'thecheesemanatyou@gmail.com'
    )
  );