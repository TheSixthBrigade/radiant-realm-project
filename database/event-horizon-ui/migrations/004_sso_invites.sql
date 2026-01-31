-- ============================================
-- SSO INVITES TABLE
-- Domain admins can invite users to their domain
-- ============================================

-- SSO Invites table
CREATE TABLE IF NOT EXISTS sso_invites (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL,
    email TEXT NOT NULL,
    invited_by INTEGER REFERENCES users(id),
    role TEXT DEFAULT 'Member',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain, email)
);

CREATE INDEX IF NOT EXISTS idx_sso_invites_domain ON sso_invites(domain);
CREATE INDEX IF NOT EXISTS idx_sso_invites_email ON sso_invites(email);
CREATE INDEX IF NOT EXISTS idx_sso_invites_expires ON sso_invites(expires_at) WHERE used_at IS NULL;

-- Add domain_role column to track user's role within their SSO domain
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_domain_role TEXT DEFAULT 'member';

-- Update existing SSO users to have proper domain roles
-- First user for each domain becomes admin
DO $$
DECLARE
    domain_rec RECORD;
    first_user_id INTEGER;
BEGIN
    FOR domain_rec IN SELECT DISTINCT domain FROM sso_configurations LOOP
        SELECT id INTO first_user_id 
        FROM users 
        WHERE email LIKE '%@' || domain_rec.domain 
        AND provider = 'sso'
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            UPDATE users SET sso_domain_role = 'domain_admin' WHERE id = first_user_id;
        END IF;
    END LOOP;
END $$;

SELECT 'SSO invites table created!' as status;
