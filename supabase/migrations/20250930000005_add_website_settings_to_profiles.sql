-- Add website_settings column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_settings JSONB DEFAULT '{}'::jsonb;
-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.website_settings IS 'JSON object containing website builder settings for creator pages';
-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_website_settings ON public.profiles USING GIN (website_settings);
