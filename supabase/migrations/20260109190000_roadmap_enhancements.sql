-- Roadmap Enhancements Migration
-- Adds: status timestamps, forum replies system, suggestion statuses

-- ============================================
-- 1. Add status_changed_at to roadmap_items
-- ============================================
ALTER TABLE roadmap_items 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing items to have status_changed_at set to their created_at
UPDATE roadmap_items SET status_changed_at = created_at WHERE status_changed_at IS NULL;

-- ============================================
-- 2. Add status_changed_at to roadmap_versions
-- ============================================
ALTER TABLE roadmap_versions 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing versions to have status_changed_at set to their created_at
UPDATE roadmap_versions SET status_changed_at = created_at WHERE status_changed_at IS NULL;

-- ============================================
-- 3. Enhance roadmap_suggestions for forum
-- ============================================
-- Change status to forum-style statuses
ALTER TABLE roadmap_suggestions 
ADD COLUMN IF NOT EXISTS forum_status TEXT DEFAULT 'open';

-- Add status_changed_at for suggestions
ALTER TABLE roadmap_suggestions 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ============================================
-- 4. Create roadmap_suggestion_replies table
-- ============================================
CREATE TABLE IF NOT EXISTS roadmap_suggestion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_replies_suggestion ON roadmap_suggestion_replies(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_replies_created ON roadmap_suggestion_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_replies_user ON roadmap_suggestion_replies(user_id);

-- ============================================
-- 5. RLS for replies table
-- ============================================
ALTER TABLE roadmap_suggestion_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can view replies
CREATE POLICY "Anyone can view suggestion replies" 
ON roadmap_suggestion_replies FOR SELECT USING (true);

-- Logged in users can create replies
CREATE POLICY "Logged in users can reply to suggestions" 
ON roadmap_suggestion_replies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own replies
CREATE POLICY "Users can update their own replies" 
ON roadmap_suggestion_replies FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own replies, creators can delete any reply on their suggestions
CREATE POLICY "Users and creators can delete replies" 
ON roadmap_suggestion_replies FOR DELETE 
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (
    SELECT creator_id FROM roadmap_suggestions WHERE id = suggestion_id
  )
);

-- ============================================
-- 6. Trigger to update status_changed_at on status change
-- ============================================
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to roadmap_items
DROP TRIGGER IF EXISTS trigger_items_status_changed ON roadmap_items;
CREATE TRIGGER trigger_items_status_changed
BEFORE UPDATE ON roadmap_items
FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();

-- Apply trigger to roadmap_versions
DROP TRIGGER IF EXISTS trigger_versions_status_changed ON roadmap_versions;
CREATE TRIGGER trigger_versions_status_changed
BEFORE UPDATE ON roadmap_versions
FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();

-- ============================================
-- 7. Function to get reply count for suggestions
-- ============================================
CREATE OR REPLACE FUNCTION get_suggestion_reply_count(suggestion_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM roadmap_suggestion_replies WHERE suggestion_id = suggestion_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 8. Updated_at trigger for replies
-- ============================================
DROP TRIGGER IF EXISTS update_roadmap_suggestion_replies_updated_at ON roadmap_suggestion_replies;
CREATE TRIGGER update_roadmap_suggestion_replies_updated_at 
BEFORE UPDATE ON roadmap_suggestion_replies 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
