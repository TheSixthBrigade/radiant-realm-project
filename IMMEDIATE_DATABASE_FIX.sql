-- IMMEDIATE FIX: Run this in Supabase Dashboard > SQL Editor
-- This will add the missing columns that are causing the error

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'independent',
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_settings JSONB DEFAULT '{}';

-- Update any existing profiles to have the default creator_type
UPDATE public.profiles 
SET creator_type = 'independent' 
WHERE creator_type IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('creator_type', 'paypal_email', 'business_name', 'website_url', 'social_links', 'website_settings')
ORDER BY column_name;