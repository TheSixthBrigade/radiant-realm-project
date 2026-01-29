-- Enable realtime for visitor_sessions table
-- This allows the admin dashboard to auto-refresh when new visitors arrive

ALTER PUBLICATION supabase_realtime ADD TABLE visitor_sessions;
