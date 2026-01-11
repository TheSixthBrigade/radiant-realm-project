-- Add support for multiple product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
-- Create policies for product_images
CREATE POLICY "Product images are viewable by everyone" 
ON public.product_images 
FOR SELECT 
USING (true);
CREATE POLICY "Creators can manage their product images" 
ON public.product_images 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.creator_id = auth.uid()
));
-- Migrate existing product images to new table
INSERT INTO public.product_images (product_id, image_url, is_primary, display_order)
SELECT id, image_url, true, 0
FROM public.products 
WHERE image_url IS NOT NULL AND image_url != '';
-- Add index for better performance
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_id, display_order);
