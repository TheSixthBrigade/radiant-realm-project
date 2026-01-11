-- Add file_urls column to products table to support multiple downloadable files
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS file_urls TEXT[];
-- Add comment to explain the column
COMMENT ON COLUMN public.products.file_urls IS 'Array of URLs to downloadable product files stored in Supabase Storage';
-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_file_urls ON public.products USING GIN (file_urls);
