-- Add onboarding fields to profiles table for seller onboarding flow

-- TOS agreement tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_agreed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_version TEXT;

-- Business profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Onboarding completion tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add constraint for business_description max length
ALTER TABLE public.profiles ADD CONSTRAINT business_description_max_length 
  CHECK (business_description IS NULL OR length(business_description) <= 500);

-- Create index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
  ON public.profiles (user_id, tos_agreed_at, business_name, stripe_connect_status);;
