-- Per-Item Voting and Forums Migration
-- Adds: per-item voting toggle, forum tables

-- ============================================
-- 1. Per-Item Voting Toggle
-- ============================================

-- Add voting_enabled column to roadmap_items
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN DEFAULT true;

-- ============================================
-- 2. Forum System Tables
-- ============================================

-- Forum categories per store
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'MessageCircle',
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_categories_creator ON forum_categories(creator_id);
CREATE INDEX IF NOT EXISTS idx_forum_categories_active ON forum_categories(is_active);

-- Forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL, -- Store owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON forum_posts(is_pinned DESC, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);

-- Forum replies
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created ON forum_replies(created_at);

-- Forum settings per store
CREATE TABLE IF NOT EXISTS forum_settings (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  require_purchase BOOLEAN DEFAULT false, -- Only buyers can post
  allow_anonymous BOOLEAN DEFAULT false,
  moderation_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Forum categories RLS
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active forum categories" 
ON forum_categories FOR SELECT 
USING (is_active = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can manage their forum categories" 
ON forum_categories FOR ALL 
USING (auth.uid() = creator_id);

-- Forum posts RLS
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forum posts" 
ON forum_posts FOR SELECT USING (true);

CREATE POLICY "Logged in users can create posts" 
ON forum_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON forum_posts FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users and creators can delete posts" 
ON forum_posts FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- Forum replies RLS
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forum replies" 
ON forum_replies FOR SELECT USING (true);

CREATE POLICY "Logged in users can create replies" 
ON forum_replies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" 
ON forum_replies FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users and creators can delete replies" 
ON forum_replies FOR DELETE 
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT creator_id FROM forum_posts WHERE id = post_id)
);

-- Forum settings RLS
ALTER TABLE forum_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forum settings" 
ON forum_settings FOR SELECT USING (true);

CREATE POLICY "Creators can manage their forum settings" 
ON forum_settings FOR ALL 
USING (auth.uid() = creator_id);

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Update reply count on forum posts
CREATE OR REPLACE FUNCTION update_forum_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts 
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        last_reply_user_id = NEW.user_id
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts 
    SET reply_count = reply_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_reply_count ON forum_replies;
CREATE TRIGGER trigger_update_forum_reply_count
AFTER INSERT OR DELETE ON forum_replies
FOR EACH ROW EXECUTE FUNCTION update_forum_post_reply_count();

-- ============================================
-- 5. Updated_at triggers
-- ============================================

DROP TRIGGER IF EXISTS update_forum_categories_updated_at ON forum_categories;
CREATE TRIGGER update_forum_categories_updated_at 
BEFORE UPDATE ON forum_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER update_forum_posts_updated_at 
BEFORE UPDATE ON forum_posts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_replies_updated_at ON forum_replies;
CREATE TRIGGER update_forum_replies_updated_at 
BEFORE UPDATE ON forum_replies 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_settings_updated_at ON forum_settings;
CREATE TRIGGER update_forum_settings_updated_at 
BEFORE UPDATE ON forum_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
