-- ============================================
-- VECTABASE SECURITY HARDENING MIGRATION
-- Enterprise-grade security to beat Supabase
-- ============================================

-- 1. ROW LEVEL SECURITY (RLS) - Isolate projects from each other
-- ============================================

-- Enable RLS on all sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (critical!)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE project_users FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE edge_functions FORCE ROW LEVEL SECURITY;
ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;

-- 2. CREATE SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to get current user ID from session (used in RLS policies)
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS INTEGER AS $$
DECLARE
    user_id INTEGER;
BEGIN
    -- This would be set by the application via SET LOCAL
    user_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    RETURN user_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to a project
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id INTEGER, p_user_id INTEGER DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    uid INTEGER;
    has_access BOOLEAN;
BEGIN
    uid := COALESCE(p_user_id, current_user_id());
    IF uid IS NULL THEN RETURN FALSE; END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM project_users 
        WHERE project_id = p_project_id AND user_id = uid
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. RLS POLICIES - Project Isolation
-- ============================================

-- Projects: Users can only see projects they have access to
DROP POLICY IF EXISTS projects_isolation ON projects;
CREATE POLICY projects_isolation ON projects
    FOR ALL
    USING (
        id IN (SELECT project_id FROM project_users WHERE user_id = current_user_id())
        OR 
        org_id IN (SELECT id FROM organizations WHERE owner_id = current_user_id())
    );

-- Project Users: Can only see memberships for projects you're in
DROP POLICY IF EXISTS project_users_isolation ON project_users;
CREATE POLICY project_users_isolation ON project_users
    FOR ALL
    USING (
        project_id IN (SELECT project_id FROM project_users pu2 WHERE pu2.user_id = current_user_id())
    );

-- API Keys: Strict project isolation
DROP POLICY IF EXISTS api_keys_isolation ON api_keys;
CREATE POLICY api_keys_isolation ON api_keys
    FOR ALL
    USING (user_has_project_access(project_id));

-- Vault Secrets: Strict project isolation (most sensitive!)
DROP POLICY IF EXISTS vault_secrets_isolation ON vault_secrets;
CREATE POLICY vault_secrets_isolation ON vault_secrets
    FOR ALL
    USING (user_has_project_access(project_id));

-- Edge Functions: Project isolation
DROP POLICY IF EXISTS edge_functions_isolation ON edge_functions;
CREATE POLICY edge_functions_isolation ON edge_functions
    FOR ALL
    USING (user_has_project_access(project_id));

-- Edge Function Files: Inherit from parent function
DROP POLICY IF EXISTS edge_function_files_isolation ON edge_function_files;
CREATE POLICY edge_function_files_isolation ON edge_function_files
    FOR ALL
    USING (
        function_id IN (
            SELECT id FROM edge_functions WHERE user_has_project_access(project_id)
        )
    );

-- Webhooks: Project isolation
DROP POLICY IF EXISTS webhooks_isolation ON webhooks;
CREATE POLICY webhooks_isolation ON webhooks
    FOR ALL
    USING (user_has_project_access(project_id));

-- Storage Buckets: Project isolation
DROP POLICY IF EXISTS storage_buckets_isolation ON storage_buckets;
CREATE POLICY storage_buckets_isolation ON storage_buckets
    FOR ALL
    USING (user_has_project_access(project_id));

-- Storage Objects: Inherit from bucket
DROP POLICY IF EXISTS storage_objects_isolation ON storage_objects;
CREATE POLICY storage_objects_isolation ON storage_objects
    FOR ALL
    USING (
        bucket_id IN (
            SELECT id FROM storage_buckets WHERE user_has_project_access(project_id)
        )
    );

-- Provider Configs: Project isolation
DROP POLICY IF EXISTS provider_configs_isolation ON provider_configs;
CREATE POLICY provider_configs_isolation ON provider_configs
    FOR ALL
    USING (user_has_project_access(project_id));

-- 4. AUDIT LOGGING
-- ============================================

-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    resource_type TEXT,
    resource_id TEXT,
    project_id INTEGER,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_audit_project ON security_audit_log(project_id);
CREATE INDEX idx_audit_event ON security_audit_log(event_type);
CREATE INDEX idx_audit_risk ON security_audit_log(risk_level);
CREATE INDEX idx_audit_created ON security_audit_log(created_at DESC);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_project_id INTEGER DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_risk_level TEXT DEFAULT 'low'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type, user_id, action, resource_type, resource_id, 
        project_id, old_values, new_values, risk_level
    ) VALUES (
        p_event_type, current_user_id(), p_action, p_resource_type, 
        p_resource_id, p_project_id, p_old_values, p_new_values, p_risk_level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP, user_id, or API key
    identifier_type TEXT NOT NULL, -- 'ip', 'user', 'api_key'
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rate_limit_key ON rate_limits(identifier, identifier_type, endpoint);
CREATE INDEX idx_rate_limit_blocked ON rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_record rate_limits%ROWTYPE;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Check if blocked
    SELECT * INTO v_record 
    FROM rate_limits 
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type 
      AND endpoint = p_endpoint;
    
    IF FOUND AND v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN FALSE; -- Still blocked
    END IF;
    
    -- Upsert rate limit record
    INSERT INTO rate_limits (identifier, identifier_type, endpoint, request_count, window_start)
    VALUES (p_identifier, p_identifier_type, p_endpoint, 1, NOW())
    ON CONFLICT (identifier, identifier_type, endpoint) DO UPDATE SET
        request_count = CASE 
            WHEN rate_limits.window_start < v_window_start THEN 1
            ELSE rate_limits.request_count + 1
        END,
        window_start = CASE 
            WHEN rate_limits.window_start < v_window_start THEN NOW()
            ELSE rate_limits.window_start
        END,
        blocked_until = CASE 
            WHEN rate_limits.request_count >= p_max_requests THEN NOW() + INTERVAL '5 minutes'
            ELSE NULL
        END
    RETURNING * INTO v_record;
    
    RETURN v_record.request_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- 6. FAILED LOGIN TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS failed_logins (
    id SERIAL PRIMARY KEY,
    email TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT,
    failure_reason TEXT,
    attempt_count INTEGER DEFAULT 1,
    first_attempt TIMESTAMPTZ DEFAULT NOW(),
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

CREATE INDEX idx_failed_logins_ip ON failed_logins(ip_address);
CREATE INDEX idx_failed_logins_email ON failed_logins(email);
CREATE INDEX idx_failed_logins_locked ON failed_logins(locked_until) WHERE locked_until IS NOT NULL;

-- Function to record failed login and check if locked
CREATE OR REPLACE FUNCTION record_failed_login(
    p_email TEXT,
    p_ip INET,
    p_user_agent TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'invalid_credentials'
) RETURNS BOOLEAN AS $$ -- Returns TRUE if account is now locked
DECLARE
    v_attempt_count INTEGER;
    v_locked BOOLEAN := FALSE;
BEGIN
    INSERT INTO failed_logins (email, ip_address, user_agent, failure_reason)
    VALUES (p_email, p_ip, p_user_agent, p_reason)
    ON CONFLICT DO NOTHING;
    
    -- Update existing record for this IP
    UPDATE failed_logins 
    SET attempt_count = attempt_count + 1,
        last_attempt = NOW(),
        locked_until = CASE 
            WHEN attempt_count >= 4 THEN NOW() + INTERVAL '15 minutes'
            WHEN attempt_count >= 9 THEN NOW() + INTERVAL '1 hour'
            WHEN attempt_count >= 14 THEN NOW() + INTERVAL '24 hours'
            ELSE NULL
        END
    WHERE ip_address = p_ip 
      AND (email = p_email OR email IS NULL)
      AND first_attempt > NOW() - INTERVAL '24 hours'
    RETURNING attempt_count >= 5 INTO v_locked;
    
    -- Log high-risk event
    IF v_locked THEN
        PERFORM log_security_event('auth', 'account_locked', 'user', p_email, NULL, NULL, 
            jsonb_build_object('ip', p_ip::TEXT, 'reason', p_reason), 'high');
    END IF;
    
    RETURN v_locked;
END;
$$ LANGUAGE plpgsql;

-- Function to check if login is allowed
CREATE OR REPLACE FUNCTION is_login_allowed(p_email TEXT, p_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMPTZ;
BEGIN
    SELECT MAX(locked_until) INTO v_locked_until
    FROM failed_logins
    WHERE (email = p_email OR ip_address = p_ip)
      AND locked_until > NOW();
    
    RETURN v_locked_until IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clear failed logins on successful auth
CREATE OR REPLACE FUNCTION clear_failed_logins(p_email TEXT, p_ip INET)
RETURNS VOID AS $$
BEGIN
    DELETE FROM failed_logins 
    WHERE email = p_email OR ip_address = p_ip;
END;
$$ LANGUAGE plpgsql;

SELECT 'Security hardening migration complete!' as status;
