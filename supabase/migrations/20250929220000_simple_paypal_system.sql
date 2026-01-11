-- Simple PayPal-based payment system like Payhip
-- Remove complex Stripe stuff and focus on what works

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'independent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
-- Create simple payment transactions table (no Stripe complexity)
CREATE TABLE IF NOT EXISTS public.simple_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) NOT NULL,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'paypal',
  payment_status TEXT DEFAULT 'pending',
  paypal_transaction_id TEXT,
  buyer_email TEXT NOT NULL,
  seller_paypal_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);
-- Create user websites table for the website builder
CREATE TABLE IF NOT EXISTS public.user_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_name TEXT NOT NULL,
  site_slug TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  custom_domain TEXT,
  site_content JSONB DEFAULT '{}',
  theme_settings JSONB DEFAULT '{"primaryColor": "#3b82f6", "secondaryColor": "#1e40af"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.simple_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_websites ENABLE ROW LEVEL SECURITY;
-- RLS policies for simple_payments
CREATE POLICY "Users can view their own payments" ON public.simple_payments
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "System can insert payments" ON public.simple_payments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update payments" ON public.simple_payments
  FOR UPDATE USING (true);
-- RLS policies for user_websites
CREATE POLICY "Users can view their own websites" ON public.user_websites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own websites" ON public.user_websites
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public websites are viewable by everyone" ON public.user_websites
  FOR SELECT USING (is_public = true);
-- Admin policy for thecheesemanatyou@gmail.com
CREATE POLICY "Admin can manage all websites" ON public.user_websites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'thecheesemanatyou@gmail.com'
    )
  );
-- Function to generate unique site slug
CREATE OR REPLACE FUNCTION generate_site_slug(site_name TEXT)
RETURNS TEXT AS $
DECLARE
  base_slug TEXT;
final_slug TEXT;
counter INTEGER := 0;
BEGIN
  -- Create base slug from site name
  base_slug := LOWER(REGEXP_REPLACE(site_name, '[^a-zA-Z0-9]+', '-', 'g'));
base_slug := TRIM(BOTH '-' FROM base_slug);
-- Ensure it's not empty
  IF base_slug = '' THEN
    base_slug := 'site';
END IF;
final_slug := base_slug;
-- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM user_websites WHERE site_slug = final_slug) LOOP
    counter := counter + 1;
final_slug := base_slug || '-' || counter;
END LOOP;
RETURN final_slug;
END;
$ LANGUAGE plpgsql;
-- Function to create default website when user becomes creator
CREATE OR REPLACE FUNCTION create_user_website()
RETURNS TRIGGER AS $
DECLARE
  new_site_id UUID;
site_slug TEXT;
BEGIN
  -- Only create website if user becomes creator and doesn't have one
  IF NEW.is_creator = true AND (OLD.is_creator = false OR OLD.is_creator IS NULL) THEN
    -- Check if user already has a website
    IF NOT EXISTS (SELECT 1 FROM user_websites WHERE user_id = NEW.user_id) THEN
      -- Generate unique site slug
      site_slug := generate_site_slug(COALESCE(NEW.display_name, 'My Site'));
-- Create the website
      INSERT INTO public.user_websites (
        user_id, 
        site_name, 
        site_slug, 
        is_public,
        site_content
      ) VALUES (
        NEW.user_id,
        COALESCE(NEW.display_name || '''s Site', 'My Site'),
        site_slug,
        true,
        '{"title": "Welcome to my site", "description": "Check out my digital products!", "sections": []}'
      ) RETURNING id INTO new_site_id;
END IF;
END IF;
RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Create trigger for website creation
DROP TRIGGER IF EXISTS create_user_website_trigger ON public.profiles;
CREATE TRIGGER create_user_website_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_website();
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_simple_payments_buyer_id ON public.simple_payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_simple_payments_seller_id ON public.simple_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_simple_payments_product_id ON public.simple_payments(product_id);
CREATE INDEX IF NOT EXISTS idx_user_websites_user_id ON public.user_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_websites_slug ON public.user_websites(site_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON public.profiles(paypal_email) WHERE paypal_email IS NOT NULL;
