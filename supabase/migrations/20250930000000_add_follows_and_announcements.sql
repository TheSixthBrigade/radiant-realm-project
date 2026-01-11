-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
-- Create announcements table for admin messages
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success, update
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);
-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- Policies for follows
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  USING (true);
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);
-- Policies for announcements
CREATE POLICY "Everyone can view active announcements"
  ON announcements FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
-- Helper function to check if following
CREATE OR REPLACE FUNCTION is_following(follower_id_param UUID, following_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = follower_id_param
    AND following_id = following_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Helper function to follow a creator
CREATE OR REPLACE FUNCTION follow_creator(follower_id_param UUID, following_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO follows (follower_id, following_id)
  VALUES (follower_id_param, following_id_param)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Helper function to unfollow a creator
CREATE OR REPLACE FUNCTION unfollow_creator(follower_id_param UUID, following_id_param UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM follows
  WHERE follower_id = follower_id_param
  AND following_id = following_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Helper function to get followed creators
CREATE OR REPLACE FUNCTION get_followed_creators(user_id_param UUID)
RETURNS TABLE (following_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT f.following_id
  FROM follows f
  WHERE f.follower_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get feed items (followed creators' products + announcements)
CREATE OR REPLACE FUNCTION get_user_feed(user_id_param UUID, limit_param INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  creator_id UUID,
  creator_name TEXT,
  creator_avatar TEXT,
  created_at TIMESTAMPTZ,
  product_id UUID,
  price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Get products from followed creators
  SELECT 
    p.id,
    'product'::TEXT as type,
    p.title,
    p.description,
    p.image_url,
    p.creator_id,
    prof.display_name as creator_name,
    prof.avatar_url as creator_avatar,
    p.created_at,
    p.id as product_id,
    p.price
  FROM products p
  JOIN follows f ON f.following_id = p.creator_id
  JOIN profiles prof ON prof.user_id = p.creator_id
  WHERE f.follower_id = user_id_param
  
  UNION ALL
  
  -- Get active announcements
  SELECT 
    a.id,
    'announcement'::TEXT as type,
    a.title,
    a.message as description,
    NULL as image_url,
    a.admin_id as creator_id,
    prof.display_name as creator_name,
    prof.avatar_url as creator_avatar,
    a.created_at,
    NULL as product_id,
    NULL as price
  FROM announcements a
  JOIN profiles prof ON prof.user_id = a.admin_id
  WHERE a.is_active = true
  
  ORDER BY created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
