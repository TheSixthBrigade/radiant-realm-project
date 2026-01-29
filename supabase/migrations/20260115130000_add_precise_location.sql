-- Add precise location columns to visitor_sessions
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS accuracy DECIMAL(10, 2); -- meters
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS isp TEXT;
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS org TEXT;
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS as_name TEXT;

-- Index for geo queries
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_lat_lng ON visitor_sessions(latitude, longitude);
