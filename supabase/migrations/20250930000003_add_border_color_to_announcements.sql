-- Add border_color column to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT 'red' CHECK (border_color IN ('red', 'orange', 'green'));
-- Add comment to explain the column
COMMENT ON COLUMN public.announcements.border_color IS 'Border color for announcement cards in the feed (red, orange, or green)';
