-- Create stores table for seller shops
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  stripe_connect_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_sales NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Create store_products junction table 
CREATE TABLE public.store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);
-- Update products table to include store_id
ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
-- Create payment_transactions table for tracking payments
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  buyer_id UUID,
  seller_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  seller_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Enable RLS on all new tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
-- Create RLS policies for stores
CREATE POLICY "Stores are viewable by everyone" 
ON public.stores 
FOR SELECT 
USING (true);
CREATE POLICY "Users can create their own store" 
ON public.stores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own store" 
ON public.stores 
FOR UPDATE 
USING (auth.uid() = user_id);
-- Create RLS policies for store_products
CREATE POLICY "Store products are viewable by everyone" 
ON public.store_products 
FOR SELECT 
USING (true);
CREATE POLICY "Store owners can manage their products" 
ON public.store_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = store_products.store_id 
  AND stores.user_id = auth.uid()
));
-- Create RLS policies for payment_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "System can insert transactions" 
ON public.payment_transactions 
FOR INSERT 
WITH CHECK (true);
-- Add trigger for updating store timestamps
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create function to update store stats
CREATE OR REPLACE FUNCTION public.update_store_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update store total sales and earnings
  UPDATE public.stores 
  SET 
    total_sales = total_sales + 1,
    total_earnings = total_earnings + NEW.seller_amount
  WHERE id = NEW.store_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
-- Create trigger to update store stats on successful payment
CREATE TRIGGER update_store_stats_trigger
AFTER INSERT ON public.payment_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.update_store_stats();
