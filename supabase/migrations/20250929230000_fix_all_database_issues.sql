-- COMPREHENSIVE FIX FOR ALL DATABASE ISSUES
-- This migration will fix all the missing columns and relationships

-- First, let's make sure all required columns exist in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'independent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Make sure products table has proper structure
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create a proper foreign key relationship between products and profiles
-- First, let's make sure the relationship works by checking existing data
DO $$ 
BEGIN
    -- Update any products that might have invalid creator_id references
    UPDATE public.products 
    SET creator_id = (SELECT id FROM auth.users LIMIT 1)
    WHERE creator_id IS NULL OR creator_id NOT IN (SELECT id FROM auth.users);
END $$;

-- Now let's fix the ProductCard query by using a proper join
-- We'll create a view that makes the relationship clear
CREATE OR REPLACE VIEW public.products_with_creator AS
SELECT 
    p.*,
    pr.display_name as creator_display_name,
    pr.paypal_email as creator_paypal_email,
    pr.avatar_url as creator_avatar_url,
    pr.bio as creator_bio
FROM public.products p
LEFT JOIN public.profiles pr ON p.creator_id = pr.user_id
WHERE p.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.products_with_creator TO authenticated;
GRANT SELECT ON public.products_with_creator TO anon;

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

-- Enable RLS on new tables
ALTER TABLE public.simple_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_websites ENABLE ROW LEVEL SECURITY;

-- RLS policies for simple_payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.simple_payments;
CREATE POLICY "Users can view their own payments" ON public.simple_payments
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "System can insert payments" ON public.simple_payments;
CREATE POLICY "System can insert payments" ON public.simple_payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update payments" ON public.simple_payments;
CREATE POLICY "System can update payments" ON public.simple_payments
  FOR UPDATE USING (true);

-- RLS policies for user_websites
DROP POLICY IF EXISTS "Users can view their own websites" ON public.user_websites;
CREATE POLICY "Users can view their own websites" ON public.user_websites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own websites" ON public.user_websites;
CREATE POLICY "Users can manage their own websites" ON public.user_websites
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public websites are viewable by everyone" ON public.user_websites;
CREATE POLICY "Public websites are viewable by everyone" ON public.user_websites
  FOR SELECT USING (is_public = true);

-- Admin policy for thecheesemanatyou@gmail.com
DROP POLICY IF EXISTS "Admin can manage all websites" ON public.user_websites;
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simple_payments_buyer_id ON public.simple_payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_simple_payments_seller_id ON public.simple_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_simple_payments_product_id ON public.simple_payments(product_id);
CREATE INDEX IF NOT EXISTS idx_user_websites_user_id ON public.user_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_websites_slug ON public.user_websites(site_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON public.profiles(paypal_email) WHERE paypal_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON public.products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active) WHERE is_active = true;

-- Make sure we have some test data for development
-- Insert a test profile if none exists for the admin user
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'thecheesemanatyou@gmail.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert or update admin profile
        INSERT INTO public.profiles (user_id, display_name, is_creator, paypal_email)
        VALUES (admin_user_id, 'Admin User', true, 'admin@example.com')
        ON CONFLICT (user_id) DO UPDATE SET
            is_creator = true,
            paypal_email = COALESCE(profiles.paypal_email, 'admin@example.com');
    END IF;
END $$;