/**
 * Rate Limiting & Usage Tracking
 * 
 * This module provides rate limiting infrastructure with configurable limits.
 * Currently set to unlimited (Infinity) but tracks all usage for analytics.
 * 
 * Features:
 * - Per-project request tracking
 * - Per-API-key request tracking  
 * - Egress (data transfer) tracking
 * - Configurable limits (currently unlimited)
 * - Usage analytics storage
 */

import { query } from '@/lib/db';

// Rate limit configuration - set to Infinity for unlimited
export const RATE_LIMITS = {
    // Requests per minute per API key
    requestsPerMinute: Infinity,
    // Requests per hour per API key
    requestsPerHour: Infinity,
    // Requests per day per API key
    requestsPerDay: Infinity,
    // Max egress bytes per request (unlimited)
    maxEgressPerRequest: Infinity,
    // Max egress bytes per day per project (unlimited)
    maxEgressPerDay: Infinity,
    // Max rows per query (unlimited)
    maxRowsPerQuery: Infinity,
};

// In-memory tracking (for speed - persisted async to DB)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const egressTracking = new Map<string, { bytes: number; resetAt: number }>();

/**
 * Track a request and check rate limits
 * Returns { allowed: true } if request should proceed
 * Returns { allowed: false, reason: string } if blocked
 */
export async function checkRateLimit(
    projectId: number | string,
    apiKeyPrefix?: string
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const key = `${projectId}:${apiKeyPrefix || 'session'}`;
    const now = Date.now();
    const minuteWindow = 60 * 1000;

    // Get or create tracking entry
    let tracking = requestCounts.get(key);
    if (!tracking || now > tracking.resetAt) {
        tracking = { count: 0, resetAt: now + minuteWindow };
        requestCounts.set(key, tracking);
    }

    // Increment count
    tracking.count++;

    // Check limit (currently Infinity, so always passes)
    if (tracking.count > RATE_LIMITS.requestsPerMinute) {
        return {
            allowed: false,
            reason: `Rate limit exceeded: ${RATE_LIMITS.requestsPerMinute} requests per minute`,
            remaining: 0
        };
    }

    // Fire and forget: persist usage to database
    persistUsage(projectId, apiKeyPrefix, 'request', 1).catch(() => {});

    return {
        allowed: true,
        remaining: RATE_LIMITS.requestsPerMinute === Infinity 
            ? Infinity 
            : RATE_LIMITS.requestsPerMinute - tracking.count
    };
}

/**
 * Track egress (data transfer out)
 */
export async function trackEgress(
    projectId: number | string,
    bytes: number,
    apiKeyPrefix?: string
): Promise<{ allowed: boolean; reason?: string }> {
    const key = `egress:${projectId}`;
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;

    // Get or create tracking entry
    let tracking = egressTracking.get(key);
    if (!tracking || now > tracking.resetAt) {
        tracking = { bytes: 0, resetAt: now + dayWindow };
        egressTracking.set(key, tracking);
    }

    // Add bytes
    tracking.bytes += bytes;

    // Check limit (currently Infinity, so always passes)
    if (tracking.bytes > RATE_LIMITS.maxEgressPerDay) {
        return {
            allowed: false,
            reason: `Egress limit exceeded: ${formatBytes(RATE_LIMITS.maxEgressPerDay)} per day`
        };
    }

    // Fire and forget: persist usage to database
    persistUsage(projectId, apiKeyPrefix, 'egress_bytes', bytes).catch(() => {});

    return { allowed: true };
}

/**
 * Persist usage data to database for analytics
 */
async function persistUsage(
    projectId: number | string,
    apiKeyPrefix: string | undefined,
    metricType: string,
    value: number
): Promise<void> {
    try {
        // Upsert into usage_metrics table
        await query(`
            INSERT INTO usage_metrics (project_id, api_key_prefix, metric_type, value, period_start)
            VALUES ($1, $2, $3, $4, date_trunc('hour', NOW()))
            ON CONFLICT (project_id, api_key_prefix, metric_type, period_start)
            DO UPDATE SET value = usage_metrics.value + $4, updated_at = NOW()
        `, [projectId, apiKeyPrefix || 'session', metricType, value]);
    } catch (error) {
        // Silently fail - don't block requests for analytics
        // Table might not exist yet
    }
}

/**
 * Get usage stats for a project
 */
export async function getUsageStats(projectId: number | string): Promise<{
    requestsToday: number;
    requestsThisMonth: number;
    egressToday: number;
    egressThisMonth: number;
}> {
    try {
        const todayRes = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN metric_type = 'request' THEN value ELSE 0 END), 0) as requests,
                COALESCE(SUM(CASE WHEN metric_type = 'egress_bytes' THEN value ELSE 0 END), 0) as egress
            FROM usage_metrics
            WHERE project_id = $1 AND period_start >= date_trunc('day', NOW())
        `, [projectId]);

        const monthRes = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN metric_type = 'request' THEN value ELSE 0 END), 0) as requests,
                COALESCE(SUM(CASE WHEN metric_type = 'egress_bytes' THEN value ELSE 0 END), 0) as egress
            FROM usage_metrics
            WHERE project_id = $1 AND period_start >= date_trunc('month', NOW())
        `, [projectId]);

        return {
            requestsToday: parseInt(todayRes.rows[0]?.requests || '0'),
            requestsThisMonth: parseInt(monthRes.rows[0]?.requests || '0'),
            egressToday: parseInt(todayRes.rows[0]?.egress || '0'),
            egressThisMonth: parseInt(monthRes.rows[0]?.egress || '0'),
        };
    } catch (error) {
        return { requestsToday: 0, requestsThisMonth: 0, egressToday: 0, egressThisMonth: 0 };
    }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes === Infinity) return 'Unlimited';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(projectId: number | string): Record<string, string> {
    const key = `${projectId}:session`;
    const tracking = requestCounts.get(key);
    
    return {
        'X-RateLimit-Limit': RATE_LIMITS.requestsPerMinute === Infinity ? 'unlimited' : String(RATE_LIMITS.requestsPerMinute),
        'X-RateLimit-Remaining': tracking 
            ? (RATE_LIMITS.requestsPerMinute === Infinity ? 'unlimited' : String(Math.max(0, RATE_LIMITS.requestsPerMinute - tracking.count)))
            : 'unlimited',
        'X-RateLimit-Reset': tracking ? String(Math.ceil(tracking.resetAt / 1000)) : '0',
        'X-Egress-Limit': 'unlimited',
    };
}
