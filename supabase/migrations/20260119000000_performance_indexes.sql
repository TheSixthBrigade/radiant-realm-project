-- Performance Optimization: Add indexes for frequently queried columns
-- This migration adds indexes to improve query performance across the platform
-- Only adds indexes for columns that exist in the current schema

-- Forum Performance Indexes (CRITICAL - Forums are slow)
DO $$ 
BEGIN
  -- Forum posts indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_category_id ON forum_posts(category_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'creator_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_creator_id ON forum_posts(creator_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'is_pinned') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned_created ON forum_posts(is_pinned DESC, created_at DESC);
  END IF;
  
  -- Forum replies indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_replies' AND column_name = 'post_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_replies' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_replies' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON forum_replies(user_id);
  END IF;
  
  -- Forum categories indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_categories' AND column_name = 'creator_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_categories_creator_id ON forum_categories(creator_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_categories' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_categories_active_sort ON forum_categories(is_active, sort_order);
  END IF;
END $$;

-- Product Performance Indexes (skip if already exist)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_top_rated ON products(is_top_rated) WHERE is_top_rated = true;
CREATE INDEX IF NOT EXISTS idx_products_downloads ON products(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);

-- Sales Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- Profile Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_connect_status') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_stripe_status ON profiles(stripe_connect_status);
  END IF;
END $$;

-- Visitor Analytics Indexes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitor_sessions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitor_sessions' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at DESC);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitor_sessions' AND column_name = 'last_seen_at') THEN
      CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen ON visitor_sessions(last_seen_at DESC);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitor_sessions' AND column_name = 'page_url') THEN
      CREATE INDEX IF NOT EXISTS idx_visitor_sessions_page_url ON visitor_sessions(page_url);
    END IF;
  END IF;
END $$;

-- Roadmap Performance Indexes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_items') THEN
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_product_id ON roadmap_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON roadmap_items(status);
    CREATE INDEX IF NOT EXISTS idx_roadmap_items_created_at ON roadmap_items(created_at DESC);
  END IF;
END $$;

-- Newsletter Performance Indexes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newsletter_subscribers' AND column_name = 'email') THEN
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newsletter_subscribers' AND column_name = 'creator_id') THEN
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_creator_id ON newsletter_subscribers(creator_id);
    END IF;
  END IF;
END $$;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_creator_category ON products(creator_id, category);
CREATE INDEX IF NOT EXISTS idx_sales_product_buyer ON sales(product_id, buyer_id);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_category_created ON forum_posts(category_id, created_at DESC);
  END IF;
END $$;

-- Full-text search indexes (for search functionality)
DO $$ 
BEGIN
  -- Products search
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_title_search') THEN
    CREATE INDEX idx_products_title_search ON products USING gin(to_tsvector('english', title));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_description_search') THEN
    CREATE INDEX idx_products_description_search ON products USING gin(to_tsvector('english', description));
  END IF;
  
  -- Forum search
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'title') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forum_posts_title_search') THEN
      CREATE INDEX idx_forum_posts_title_search ON forum_posts USING gin(to_tsvector('english', title));
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'content') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_forum_posts_content_search') THEN
      CREATE INDEX idx_forum_posts_content_search ON forum_posts USING gin(to_tsvector('english', content));
    END IF;
  END IF;
END $$;
