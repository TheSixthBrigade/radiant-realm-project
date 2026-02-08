-- Migration 007: Add is_revoked column to sessions table
-- Required by lib/security.ts verifyAuth() which checks NOT s.is_revoked

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false;

-- Partial index for efficient lookup of revoked sessions
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked) WHERE is_revoked = true;
