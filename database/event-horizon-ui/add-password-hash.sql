-- Add password_hash column to users table for SSO email authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;

SELECT 'password_hash column added to users table!' as status;
