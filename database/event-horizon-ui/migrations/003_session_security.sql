-- ============================================
-- VECTABASE SESSION & TOKEN SECURITY
-- Secure session management with rotation
-- ============================================

-- 1. ENHANCED SESSIONS TABLE
-- ============================================

-- Add security columns to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB;

CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked) WHERE is_revoked = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity DESC);

-- 2. SESSION MANAGEMENT FUNCTIONS
-- ============================================

-- Create a new secure session
CREATE OR REPLACE FUNCTION create_secure_session(
    p_user_id INTEGER,
    p_ip INET,
    p_user_agent TEXT,
    p_fingerprint TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
) RETURNS TABLE(session_id INTEGER, token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_token TEXT;
    v_token_hash TEXT;
    v_fingerprint_hash TEXT;
    v_expires TIMESTAMPTZ;
    v_session_id INTEGER;
BEGIN
    -- Generate secure token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_fingerprint_hash := CASE WHEN p_fingerprint IS NOT NULL 
        THEN encode(digest(p_fingerprint, 'sha256'), 'hex') 
        ELSE NULL END;
    v_expires := NOW() + INTERVAL '7 days';
    
    -- Limit concurrent sessions per user (max 5)
    DELETE FROM sessions 
    WHERE user_id = p_user_id 
      AND id NOT IN (
          SELECT id FROM sessions 
          WHERE user_id = p_user_id 
          ORDER BY last_activity DESC 
          LIMIT 4
      );
    
    -- Create session
    INSERT INTO sessions (
        user_id, token_hash, expires_at, ip_address, 
        user_agent, fingerprint_hash, device_info
    ) VALUES (
        p_user_id, v_token_hash, v_expires, p_ip,
        p_user_agent, v_fingerprint_hash, p_device_info
    ) RETURNING id INTO v_session_id;
    
    -- Clear any failed logins
    PERFORM clear_failed_logins(
        (SELECT email FROM users WHERE id = p_user_id),
        p_ip
    );
    
    -- Audit log
    PERFORM log_security_event('auth', 'session_created', 'session', v_session_id::TEXT, NULL, NULL,
        jsonb_build_object('ip', p_ip::TEXT, 'user_agent', left(p_user_agent, 100)), 'low');
    
    RETURN QUERY SELECT v_session_id, v_token, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate and refresh session
CREATE OR REPLACE FUNCTION validate_session(
    p_token TEXT,
    p_ip INET DEFAULT NULL,
    p_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE(
    user_id INTEGER, 
    email TEXT, 
    name TEXT,
    is_valid BOOLEAN,
    new_token TEXT
) AS $$
DECLARE
    v_token_hash TEXT;
    v_fingerprint_hash TEXT;
    v_session sessions%ROWTYPE;
    v_user users%ROWTYPE;
    v_new_token TEXT;
    v_should_rotate BOOLEAN;
BEGIN
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
    v_fingerprint_hash := CASE WHEN p_fingerprint IS NOT NULL 
        THEN encode(digest(p_fingerprint, 'sha256'), 'hex') 
        ELSE NULL END;
    
    -- Find session
    SELECT * INTO v_session FROM sessions 
    WHERE token_hash = v_token_hash 
      AND NOT is_revoked 
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Fingerprint validation (if provided)
    IF v_fingerprint_hash IS NOT NULL AND v_session.fingerprint_hash IS NOT NULL 
       AND v_fingerprint_hash != v_session.fingerprint_hash THEN
        -- Potential session hijacking!
        UPDATE sessions SET is_revoked = TRUE, revoked_reason = 'fingerprint_mismatch' 
        WHERE id = v_session.id;
        
        PERFORM log_security_event('auth', 'session_hijack_attempt', 'session', 
            v_session.id::TEXT, NULL, NULL,
            jsonb_build_object('ip', p_ip::TEXT, 'expected_fp', v_session.fingerprint_hash), 'critical');
        
        RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Get user
    SELECT * INTO v_user FROM users WHERE id = v_session.user_id;
    
    -- Check if token should be rotated (every 15 minutes or 10 refreshes)
    v_should_rotate := v_session.last_activity < NOW() - INTERVAL '15 minutes'
                    OR v_session.refresh_count >= 10;
    
    IF v_should_rotate THEN
        -- Generate new token
        v_new_token := encode(gen_random_bytes(32), 'hex');
        
        UPDATE sessions SET
            token_hash = encode(digest(v_new_token, 'sha256'), 'hex'),
            refresh_count = 0,
            last_activity = NOW(),
            ip_address = COALESCE(p_ip, ip_address)
        WHERE id = v_session.id;
    ELSE
        -- Just update activity
        UPDATE sessions SET
            refresh_count = refresh_count + 1,
            last_activity = NOW()
        WHERE id = v_session.id;
        
        v_new_token := NULL;
    END IF;
    
    RETURN QUERY SELECT v_user.id, v_user.email, v_user.name, TRUE, v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke session
CREATE OR REPLACE FUNCTION revoke_session(
    p_session_id INTEGER,
    p_reason TEXT DEFAULT 'user_logout'
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sessions SET 
        is_revoked = TRUE, 
        revoked_reason = p_reason
    WHERE id = p_session_id;
    
    PERFORM log_security_event('auth', 'session_revoked', 'session', p_session_id::TEXT, 
        NULL, NULL, jsonb_build_object('reason', p_reason), 'low');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all sessions for a user (password change, security concern)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
    p_user_id INTEGER,
    p_reason TEXT DEFAULT 'security_action',
    p_except_session_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE sessions SET 
        is_revoked = TRUE, 
        revoked_reason = p_reason
    WHERE user_id = p_user_id 
      AND NOT is_revoked
      AND (p_except_session_id IS NULL OR id != p_except_session_id);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    PERFORM log_security_event('auth', 'all_sessions_revoked', 'user', p_user_id::TEXT, 
        NULL, NULL, jsonb_build_object('reason', p_reason, 'count', v_count), 'high');
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CLEANUP JOBS
-- ============================================

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Also clean up old failed logins
    DELETE FROM failed_logins WHERE last_attempt < NOW() - INTERVAL '7 days';
    
    -- Clean up old rate limits
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. ACTIVE SESSIONS VIEW
-- ============================================

CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.email,
    u.name,
    s.ip_address,
    s.user_agent,
    s.created_at,
    s.last_activity,
    s.expires_at,
    s.device_info,
    CASE 
        WHEN s.last_activity > NOW() - INTERVAL '5 minutes' THEN 'active'
        WHEN s.last_activity > NOW() - INTERVAL '1 hour' THEN 'idle'
        ELSE 'inactive'
    END as status
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE NOT s.is_revoked AND s.expires_at > NOW();

SELECT 'Session security complete!' as status;
