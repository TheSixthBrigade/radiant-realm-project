-- Drop and recreate follower functions with proper security settings
DROP FUNCTION IF EXISTS public.is_following(UUID, UUID);
DROP FUNCTION IF EXISTS public.follow_creator(UUID, UUID);
DROP FUNCTION IF EXISTS public.unfollow_creator(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_followed_creators(UUID);
DROP FUNCTION IF EXISTS public.get_user_feed(UUID, INT);

-- These functions use the follows table, not creator_followers
CREATE FUNCTION public.is_following(p_follower_id UUID, p_creator_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = p_follower_id 
    AND following_id = p_creator_id
  );
END;
$$;

CREATE FUNCTION public.follow_creator(p_follower_id UUID, p_creator_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO follows (follower_id, following_id)
  VALUES (p_follower_id, p_creator_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE FUNCTION public.unfollow_creator(p_follower_id UUID, p_creator_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM follows 
  WHERE follower_id = p_follower_id AND following_id = p_creator_id;
END;
$$;

CREATE FUNCTION public.get_followed_creators(p_user_id UUID)
RETURNS TABLE(creator_id UUID, display_name TEXT, avatar_url TEXT, followed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.following_id, p.display_name, p.avatar_url, f.created_at
  FROM follows f
  JOIN profiles p ON p.user_id = f.following_id
  WHERE f.follower_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$;

CREATE FUNCTION public.get_user_feed(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE(product_id UUID, title TEXT, description TEXT, price DECIMAL, image_url TEXT, creator_id UUID, creator_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pr.id, pr.title, pr.description, pr.price, pr.image_url, pr.creator_id, p.display_name, pr.created_at
  FROM products pr
  JOIN follows f ON f.following_id = pr.creator_id
  JOIN profiles p ON p.user_id = pr.creator_id
  WHERE f.follower_id = p_user_id
  ORDER BY pr.created_at DESC
  LIMIT p_limit;
END;
$$;;
