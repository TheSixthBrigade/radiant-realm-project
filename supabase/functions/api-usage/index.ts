import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { 
  successResponse, 
  corsResponse, 
  unauthorized, 
  rateLimited, 
  serverError 
} from '../_shared/response.ts'
import { TIERS } from '../_shared/types.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  if (req.method !== 'GET') {
    return new Response('GET only', { status: 405 });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return unauthorized();
  }

  const rateResult = checkRateLimit(auth.apiKey, auth.rateLimit);
  if (!rateResult.allowed) {
    return rateLimited(rateResult);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const includeHistory = url.searchParams.get('history') === 'true';
  const historyLimit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  try {
    const tierConfig = TIERS[auth.tier];
    const now = new Date();

    // Calculate period start
    let periodStart: Date;
    if (tierConfig.obfuscationPeriod === 'week') {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
    }

    // Get subscription usage
    const { count: subscriptionUsage } = await supabase
      .from('obfuscation_usage')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', auth.developerId)
      .eq('source', 'subscription')
      .gte('period_start', periodStart.toISOString());

    // Get credit usage (all time)
    const { count: creditUsage } = await supabase
      .from('obfuscation_usage')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', auth.developerId)
      .eq('source', 'credit');

    // Get credits balance
    const { data: creditsData } = await supabase
      .from('obfuscation_credits')
      .select('credits')
      .eq('developer_id', auth.developerId)
      .maybeSingle();

    // Get products with whitelist counts
    const { data: products } = await supabase
      .from('developer_products')
      .select('id, product_name, roblox_group_id')
      .eq('developer_id', auth.developerId);

    const productStats = [];
    for (const product of products || []) {
      const { count } = await supabase
        .from('whitelist_entries')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);

      productStats.push({
        id: product.id,
        name: product.product_name,
        roblox_group_id: product.roblox_group_id,
        whitelist_count: count || 0,
        whitelist_limit: tierConfig.whitelistLimit === -1 ? 'unlimited' : tierConfig.whitelistLimit
      });
    }

    // Build response
    const response: Record<string, unknown> = {
      tier: auth.tier,
      tier_name: tierConfig.name,
      obfuscation: {
        subscription_used: subscriptionUsage || 0,
        subscription_limit: tierConfig.obfuscationLimit === -1 ? 'unlimited' : tierConfig.obfuscationLimit,
        period: tierConfig.obfuscationPeriod,
        period_start: periodStart.toISOString(),
        credits_used_total: creditUsage || 0,
        credits_remaining: creditsData?.credits || 0
      },
      products: productStats,
      rate_limit: {
        limit: tierConfig.rateLimit,
        window: '1 minute'
      }
    };

    // Include request history if requested
    if (includeHistory) {
      const { data: logs } = await supabase
        .from('api_request_logs')
        .select('endpoint, method, status_code, request_id, created_at')
        .eq('developer_id', auth.developerId)
        .order('created_at', { ascending: false })
        .limit(historyLimit);

      response.request_history = logs || [];
    }

    return successResponse(response, 200, rateResult);

  } catch (err) {
    console.error('Usage API error:', err);
    return serverError(rateResult);
  }
});
