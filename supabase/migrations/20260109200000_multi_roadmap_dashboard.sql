-- Multi-Roadmap Dashboard Migration
-- Enables multiple roadmaps per store, one per product

-- Add product_id to roadmap_versions to associate roadmaps with products
ALTER TABLE roadmap_versions ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Add roadmap_enabled flag to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS roadmap_enabled BOOLEAN DEFAULT false;

-- Add roadmap_settings to products for per-product roadmap customization
ALTER TABLE products ADD COLUMN IF NOT EXISTS roadmap_settings JSONB DEFAULT '{}';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_product_id ON roadmap_versions(product_id);

-- Add product_id to roadmap_items for direct product association
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_roadmap_items_product_id ON roadmap_items(product_id);

-- Update RLS policies to allow product-based access
DROP POLICY IF EXISTS "Anyone can view roadmap versions" ON roadmap_versions;
CREATE POLICY "Anyone can view roadmap versions" ON roadmap_versions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage their roadmap versions" ON roadmap_versions;
CREATE POLICY "Creators can manage their roadmap versions" ON roadmap_versions
  FOR ALL USING (auth.uid() = creator_id);

-- Add policy for products roadmap settings
DROP POLICY IF EXISTS "Creators can update product roadmap settings" ON products;
CREATE POLICY "Creators can update product roadmap settings" ON products
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
