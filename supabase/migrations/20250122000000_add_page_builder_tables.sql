-- Create page_sections table for storing page builder sections
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_collections table for storing collections
CREATE TABLE IF NOT EXISTS product_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_products junction table for product-collection relationships
CREATE TABLE IF NOT EXISTS collection_products (
  collection_id UUID NOT NULL REFERENCES product_collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (collection_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_sections_user_id ON page_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON page_sections(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_product_collections_user_id ON product_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_slug ON product_collections(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);

-- Enable Row Level Security
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_sections
CREATE POLICY "Users can view their own page sections"
  ON page_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own page sections"
  ON page_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own page sections"
  ON page_sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own page sections"
  ON page_sections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for product_collections
CREATE POLICY "Users can view their own collections"
  ON product_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON product_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON product_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON product_collections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for collection_products
CREATE POLICY "Users can view collection products for their collections"
  ON collection_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_collections
      WHERE product_collections.id = collection_products.collection_id
      AND product_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert collection products for their collections"
  ON collection_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_collections
      WHERE product_collections.id = collection_products.collection_id
      AND product_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete collection products for their collections"
  ON collection_products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM product_collections
      WHERE product_collections.id = collection_products.collection_id
      AND product_collections.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_collections_updated_at
  BEFORE UPDATE ON product_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
