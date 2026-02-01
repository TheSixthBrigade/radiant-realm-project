import { NextRequest, NextResponse } from 'next/server';
import { verifyAccess } from '@/lib/auth';
import { getUsageStats, RATE_LIMITS, formatBytes } from '@/lib/rateLimit';

/**
 * GET /api/usage
 * Returns usage statistics for the authenticated project
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAccess(req);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = auth.projectId || 0;

    try {
        const stats = await getUsageStats(projectId);

        return NextResponse.json({
            projectId,
            usage: {
                requests: {
                    today: stats.requestsToday,
                    thisMonth: stats.requestsThisMonth,
                    limit: RATE_LIMITS.requestsPerDay === Infinity ? 'unlimited' : RATE_LIMITS.requestsPerDay
                },
                egress: {
                    today: stats.egressToday,
                    todayFormatted: formatBytes(stats.egressToday),
                    thisMonth: stats.egressThisMonth,
                    thisMonthFormatted: formatBytes(stats.egressThisMonth),
                    limit: RATE_LIMITS.maxEgressPerDay === Infinity ? 'unlimited' : formatBytes(RATE_LIMITS.maxEgressPerDay)
                }
            },
            limits: {
                requestsPerMinute: RATE_LIMITS.requestsPerMinute === Infinity ? 'unlimited' : RATE_LIMITS.requestsPerMinute,
                requestsPerHour: RATE_LIMITS.requestsPerHour === Infinity ? 'unlimited' : RATE_LIMITS.requestsPerHour,
                requestsPerDay: RATE_LIMITS.requestsPerDay === Infinity ? 'unlimited' : RATE_LIMITS.requestsPerDay,
                maxEgressPerRequest: RATE_LIMITS.maxEgressPerRequest === Infinity ? 'unlimited' : formatBytes(RATE_LIMITS.maxEgressPerRequest),
                maxEgressPerDay: RATE_LIMITS.maxEgressPerDay === Infinity ? 'unlimited' : formatBytes(RATE_LIMITS.maxEgressPerDay),
                maxRowsPerQuery: RATE_LIMITS.maxRowsPerQuery === Infinity ? 'unlimited' : RATE_LIMITS.maxRowsPerQuery
            },
            plan: 'unlimited' // All limits are currently set to unlimited
        });
    } catch (error: any) {
        console.error('Usage stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
