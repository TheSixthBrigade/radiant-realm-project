-- URGENT FIX: Add missing columns to profiles table
-- Run this in Supabase Dashboard > SQL Editor

-- Add all missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'independent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Update existing profiles to have default creator_type
UPDATE public.profiles 
SET creator_type = 'independent' 
WHERE creator_type IS NULL;

-- Verify the fix worked
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;