-- Create stores table for individual creator stores
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT true,
  custom_domain TEXT,
  stripe_connect_account_id TEXT,
  store_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Create payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  buyer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  store_id UUID REFERENCES stores(id),
  product_id UUID REFERENCES products(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  seller_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Create store customizations table
CREATE TABLE IF NOT EXISTS public.store_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  theme_colors JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  custom_css TEXT,
  layout_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Add store_id to products table if it doesn't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(store_slug);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_buyer_id ON public.payment_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_seller_id ON public.payment_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON public.payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_store_customizations_store_id ON public.store_customizations(store_id);
-- Enable RLS on new tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_customizations ENABLE ROW LEVEL SECURITY;
-- RLS policies for stores
CREATE POLICY "Users can view their own stores" ON public.stores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stores" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stores" ON public.stores
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stores" ON public.stores
  FOR DELETE USING (auth.uid() = user_id);
-- RLS policies for payment transactions
CREATE POLICY "Users can view their own transactions" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "System can insert transactions" ON public.payment_transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update transactions" ON public.payment_transactions
  FOR UPDATE USING (true);
-- RLS policies for store customizations
CREATE POLICY "Users can view their store customizations" ON public.store_customizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = store_customizations.store_id 
      AND stores.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage their store customizations" ON public.store_customizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = store_customizations.store_id 
      AND stores.user_id = auth.uid()
    )
  );
-- Function to create default store when user becomes creator
CREATE OR REPLACE FUNCTION public.create_default_store()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_creator = true AND (OLD.is_creator = false OR OLD.is_creator IS NULL) THEN
    INSERT INTO public.stores (user_id, store_name, store_slug, is_public)
    VALUES (
      NEW.user_id,
      COALESCE(NEW.display_name, 'My Store'),
      LOWER(REPLACE(COALESCE(NEW.display_name, 'store-' || NEW.user_id::text), ' ', '-')),
      true
    )
    ON CONFLICT (store_slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Create trigger for default store creation
DROP TRIGGER IF EXISTS create_default_store_trigger ON public.profiles;
CREATE TRIGGER create_default_store_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_store();
