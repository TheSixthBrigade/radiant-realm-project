-- Usage Metrics Table for Rate Limiting & Analytics
-- Tracks API requests and egress per project/API key

CREATE TABLE IF NOT EXISTS usage_metrics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    api_key_prefix VARCHAR(50) DEFAULT 'session',
    metric_type VARCHAR(50) NOT NULL, -- 'request', 'egress_bytes', 'query_count', etc.
    value BIGINT NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL, -- Hourly buckets
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for upsert
    CONSTRAINT usage_metrics_unique UNIQUE (project_id, api_key_prefix, metric_type, period_start)
);

-- Index for fast lookups by project and time
CREATE INDEX IF NOT EXISTS idx_usage_metrics_project_time 
ON usage_metrics (project_id, period_start DESC);

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type_time 
ON usage_metrics (metric_type, period_start DESC);

-- Comment
COMMENT ON TABLE usage_metrics IS 'Tracks API usage metrics per project for rate limiting and analytics';
