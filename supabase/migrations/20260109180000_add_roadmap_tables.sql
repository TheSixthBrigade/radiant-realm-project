-- Roadmap feature for website builder
-- Allows creators to show development roadmaps on their store pages

-- Roadmap versions/releases table
CREATE TABLE IF NOT EXISTS roadmap_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL, -- e.g., "v1.3.0 - Update"
  status TEXT NOT NULL DEFAULT 'backlog', -- backlog, in_progress, qa, completed
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmap items/tasks table
CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES roadmap_versions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog', -- backlog, in_progress, qa, completed
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmap suggestions from users (requires login)
CREATE TABLE IF NOT EXISTS roadmap_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The store owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The user suggesting
  version_id UUID REFERENCES roadmap_versions(id) ON DELETE SET NULL, -- Optional: which version to suggest for
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, implemented
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upvotes for suggestions (one per user per suggestion)
CREATE TABLE IF NOT EXISTS roadmap_suggestion_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_creator ON roadmap_versions(creator_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_version ON roadmap_items(version_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_creator ON roadmap_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_suggestions_creator ON roadmap_suggestions(creator_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_suggestions_user ON roadmap_suggestions(user_id);

-- RLS Policies
ALTER TABLE roadmap_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_suggestion_upvotes ENABLE ROW LEVEL SECURITY;

-- Roadmap versions: public read, creator write
CREATE POLICY "Anyone can view roadmap versions" ON roadmap_versions FOR SELECT USING (true);
CREATE POLICY "Creators can manage their roadmap versions" ON roadmap_versions FOR ALL USING (auth.uid() = creator_id);

-- Roadmap items: public read, creator write
CREATE POLICY "Anyone can view roadmap items" ON roadmap_items FOR SELECT USING (true);
CREATE POLICY "Creators can manage their roadmap items" ON roadmap_items FOR ALL USING (auth.uid() = creator_id);

-- Suggestions: public read, logged-in users can create, creator can manage
CREATE POLICY "Anyone can view suggestions" ON roadmap_suggestions FOR SELECT USING (true);
CREATE POLICY "Logged in users can create suggestions" ON roadmap_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suggestions" ON roadmap_suggestions FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);
CREATE POLICY "Creators can delete suggestions on their roadmap" ON roadmap_suggestions FOR DELETE USING (auth.uid() = creator_id);

-- Upvotes: logged-in users can manage their own
CREATE POLICY "Anyone can view upvotes" ON roadmap_suggestion_upvotes FOR SELECT USING (true);
CREATE POLICY "Logged in users can upvote" ON roadmap_suggestion_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their upvote" ON roadmap_suggestion_upvotes FOR DELETE USING (auth.uid() = user_id);

-- Function to update upvote count
CREATE OR REPLACE FUNCTION update_suggestion_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_suggestions SET upvotes = upvotes + 1 WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_suggestions SET upvotes = upvotes - 1 WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for upvote count
DROP TRIGGER IF EXISTS trigger_update_suggestion_upvotes ON roadmap_suggestion_upvotes;
CREATE TRIGGER trigger_update_suggestion_upvotes
AFTER INSERT OR DELETE ON roadmap_suggestion_upvotes
FOR EACH ROW EXECUTE FUNCTION update_suggestion_upvotes();
