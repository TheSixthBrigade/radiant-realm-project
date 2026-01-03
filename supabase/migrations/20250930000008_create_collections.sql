-- Create collections table for organizing products into categories
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, slug)
);

-- Create junction table for products in collections
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- Policies for collections
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (auth.uid() = creator_id);

-- Policies for collection_products
CREATE POLICY "Users can view their collection products"
  ON collection_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_products.collection_id
      AND collections.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can add products to their collections"
  ON collection_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_products.collection_id
      AND collections.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove products from their collections"
  ON collection_products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_products.collection_id
      AND collections.creator_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_collections_creator ON collections(creator_id);
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);

-- Add default "All Products" collection for existing users
INSERT INTO collections (creator_id, name, slug, description, display_order, is_visible)
SELECT DISTINCT creator_id, 'All Products', 'all-products', 'View all available products', 0, true
FROM products
WHERE creator_id IS NOT NULL
ON CONFLICT (creator_id, slug) DO NOTHING;
