-- Complete store and affiliate system migration

-- Create stores table (enhanced)
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  store_description TEXT,
  is_public BOOLEAN DEFAULT true,
  custom_domain TEXT,
  stripe_connect_account_id TEXT,
  paypal_email TEXT,
  store_logo TEXT,
  store_banner TEXT,
  theme_colors JSONB DEFAULT '{"primary": "#3b82f6", "secondary": "#1e40af", "accent": "#f59e0b"}',
  layout_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Create store members table (for team stores)
CREATE TABLE IF NOT EXISTS public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'affiliate')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, user_id)
);
-- Create affiliates table
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 25.00, -- 25% default
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, user_id)
);
-- Create affiliate sales tracking
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Create store invitations table
CREATE TABLE IF NOT EXISTS public.store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'affiliate')),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Update products table to include store_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS affiliate_enabled BOOLEAN DEFAULT true;
-- Update profiles table for store association
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_store_id UUID REFERENCES stores(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(store_slug);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_store_id ON public.affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_id ON public.affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_token ON public.store_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_invitations ENABLE ROW LEVEL SECURITY;
-- RLS Policies for stores
CREATE POLICY "Public stores are viewable by everyone" ON public.stores
  FOR SELECT USING (is_public = true);
CREATE POLICY "Store owners can view their stores" ON public.stores
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Store members can view their stores" ON public.stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_members 
      WHERE store_members.store_id = stores.id 
      AND store_members.user_id = auth.uid()
      AND store_members.status = 'accepted'
    )
  );
CREATE POLICY "Store owners can manage their stores" ON public.stores
  FOR ALL USING (auth.uid() = owner_id);
-- Admin policy for thecheesemanatyou@gmail.com
CREATE POLICY "Admin can manage all stores" ON public.stores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'thecheesemanatyou@gmail.com'
    )
  );
-- RLS Policies for store_members
CREATE POLICY "Store members can view store membership" ON public.store_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = store_members.store_id 
      AND stores.owner_id = auth.uid()
    )
  );
CREATE POLICY "Store owners can manage members" ON public.store_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = store_members.store_id 
      AND stores.owner_id = auth.uid()
    )
  );
-- RLS Policies for affiliates
CREATE POLICY "Users can view their affiliate accounts" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Store owners can manage affiliates" ON public.affiliates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = affiliates.store_id 
      AND stores.owner_id = auth.uid()
    )
  );
-- RLS Policies for affiliate_sales
CREATE POLICY "Affiliates can view their sales" ON public.affiliate_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates 
      WHERE affiliates.id = affiliate_sales.affiliate_id 
      AND affiliates.user_id = auth.uid()
    )
  );
CREATE POLICY "Store owners can view affiliate sales" ON public.affiliate_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates 
      JOIN stores ON stores.id = affiliates.store_id
      WHERE affiliates.id = affiliate_sales.affiliate_id 
      AND stores.owner_id = auth.uid()
    )
  );
-- RLS Policies for store_invitations
CREATE POLICY "Store owners can manage invitations" ON public.store_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = store_invitations.store_id 
      AND stores.owner_id = auth.uid()
    )
  );
-- Function to generate unique store slug
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from store name
  base_slug := LOWER(REGEXP_REPLACE(store_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- Ensure it's not empty
  IF base_slug = '' THEN
    base_slug := 'store';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM stores WHERE store_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM affiliates WHERE affiliate_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
-- Function to create default store when user becomes creator
CREATE OR REPLACE FUNCTION create_user_store()
RETURNS TRIGGER AS $$
DECLARE
  new_store_id UUID;
  store_slug TEXT;
BEGIN
  -- Only create store if user becomes creator and doesn't have one
  IF NEW.is_creator = true AND (OLD.is_creator = false OR OLD.is_creator IS NULL) THEN
    -- Generate unique store slug
    store_slug := generate_store_slug(COALESCE(NEW.display_name, 'My Store'));
    
    -- Create the store
    INSERT INTO public.stores (
      owner_id, 
      store_name, 
      store_slug, 
      store_description,
      is_public
    ) VALUES (
      NEW.user_id,
      COALESCE(NEW.display_name || '''s Store', 'My Store'),
      store_slug,
      'Welcome to my digital store!',
      true
    ) RETURNING id INTO new_store_id;
    
    -- Update user's primary store
    UPDATE public.profiles 
    SET primary_store_id = new_store_id 
    WHERE user_id = NEW.user_id;
    
    -- Add user as store owner in store_members
    INSERT INTO public.store_members (
      store_id, 
      user_id, 
      role, 
      status,
      accepted_at
    ) VALUES (
      new_store_id,
      NEW.user_id,
      'owner',
      'accepted',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Create trigger for store creation
DROP TRIGGER IF EXISTS create_user_store_trigger ON public.profiles;
CREATE TRIGGER create_user_store_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_store();
-- Function to handle affiliate link clicks and sales
CREATE OR REPLACE FUNCTION track_affiliate_sale(
  p_affiliate_code TEXT,
  p_product_id UUID,
  p_buyer_id UUID,
  p_sale_amount DECIMAL,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  affiliate_record RECORD;
  commission_amount DECIMAL;
BEGIN
  -- Get affiliate info
  SELECT a.*, s.owner_id as store_owner_id
  INTO affiliate_record
  FROM affiliates a
  JOIN stores s ON s.id = a.store_id
  WHERE a.affiliate_code = p_affiliate_code AND a.is_active = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate commission
  commission_amount := p_sale_amount * (affiliate_record.commission_rate / 100);
  
  -- Record the affiliate sale
  INSERT INTO affiliate_sales (
    affiliate_id,
    product_id,
    buyer_id,
    sale_amount,
    commission_amount,
    commission_rate,
    stripe_session_id
  ) VALUES (
    affiliate_record.id,
    p_product_id,
    p_buyer_id,
    p_sale_amount,
    commission_amount,
    affiliate_record.commission_rate,
    p_stripe_session_id
  );
  
  -- Update affiliate totals
  UPDATE affiliates 
  SET 
    total_earnings = total_earnings + commission_amount,
    total_sales = total_sales + 1
  WHERE id = affiliate_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
