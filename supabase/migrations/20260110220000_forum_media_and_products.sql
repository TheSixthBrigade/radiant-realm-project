-- Forum Media and Product Tagging Migration
-- Adds: media_urls for posts/replies, tagged_product_id for posts

-- ============================================
-- 1. Add media columns to forum_posts
-- ============================================

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS tagged_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_tagged_product ON forum_posts(tagged_product_id);

-- ============================================
-- 2. Add media columns to forum_replies
-- ============================================

ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- ============================================
-- 3. Create storage bucket for forum media
-- ============================================

-- Note: Storage bucket creation is done via Supabase dashboard or API
-- Bucket name: forum-media
-- Public: true (for displaying images/videos)
-- Max file size: 500MB
