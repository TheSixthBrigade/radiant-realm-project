-- Add creator types and enhanced profile fields
CREATE TYPE public.creator_type AS ENUM (
  'independent',
  'business', 
  'corporation',
  'group',
  'team',
  'studio'
);

-- Add new fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_type creator_type DEFAULT 'independent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Create creator onboarding table
CREATE TABLE IF NOT EXISTS public.creator_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  step INTEGER DEFAULT 1,
  profile_picture_uploaded BOOLEAN DEFAULT false,
  creator_type_selected BOOLEAN DEFAULT false,
  business_info_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies for creator_onboarding
CREATE POLICY "Users can view their own onboarding" 
ON public.creator_onboarding 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding" 
ON public.creator_onboarding 
FOR ALL 
USING (auth.uid() = user_id);

-- Function to create onboarding record when user becomes creator
CREATE OR REPLACE FUNCTION public.create_creator_onboarding()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.is_creator = true AND OLD.is_creator = false THEN
    INSERT INTO public.creator_onboarding (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for creator onboarding
DROP TRIGGER IF EXISTS create_creator_onboarding_trigger ON public.profiles;
CREATE TRIGGER create_creator_onboarding_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_creator_onboarding();