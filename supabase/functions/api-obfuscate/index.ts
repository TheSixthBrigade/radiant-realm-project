import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { 
  successResponse, 
  errorResponse, 
  corsResponse, 
  unauthorized, 
  rateLimited, 
  badRequest,
  serverError 
} from '../_shared/response.ts'
import { ObfuscateRequest, ObfuscateResponse, TIERS, SubscriptionTier } from '../_shared/types.ts'

// Obfuscator API running on VPS
const OBFUSCATOR_URL = Deno.env.get('OBFUSCATOR_API_URL') || 'http://localhost:5050';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  if (req.method !== 'POST') {
    return badRequest('POST only');
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

  try {
    const body: ObfuscateRequest & { level?: string } = await req.json();

    if (!body.code?.trim()) {
      return badRequest('Code is required', { code: 'Required' }, rateResult);
    }

    const tierConfig = TIERS[auth.tier];
    
    // Calculate period start based on tier
    const now = new Date();
    let periodStart: Date;
    
    if (tierConfig.obfuscationPeriod === 'week') {
      // Start of current week (Sunday)
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
    } else {
      // Start of current day
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
    }

    // Get usage count for this period (subscription-based only)
    const { count: usageCount } = await supabase
      .from('obfuscation_usage')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', auth.developerId)
      .eq('source', 'subscription')
      .gte('period_start', periodStart.toISOString());

    const currentUsage = usageCount || 0;

    // Get credits
    const { data: creditsData } = await supabase
      .from('obfuscation_credits')
      .select('credits')
      .eq('developer_id', auth.developerId)
      .maybeSingle();

    const credits = creditsData?.credits || 0;

    // Check if can obfuscate
    const hasSubscriptionAllowance = tierConfig.obfuscationLimit === -1 || currentUsage < tierConfig.obfuscationLimit;
    const hasCredits = credits > 0;

    if (!hasSubscriptionAllowance && !hasCredits) {
      return errorResponse(
        'OBFUSCATION_LIMIT',
        `Obfuscation limit reached. ${tierConfig.obfuscationLimit === -1 ? '' : `You've used ${currentUsage}/${tierConfig.obfuscationLimit} this ${tierConfig.obfuscationPeriod}.`} Purchase credits or upgrade your plan.`,
        429,
        undefined,
        rateResult
      );
    }

    // Determine source (subscription first, then credits)
    const useCredits = !hasSubscriptionAllowance;

    // Call obfuscator API
    const obfuscatorResponse = await fetch(`${OBFUSCATOR_URL}/obfuscate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: body.code,
        level: body.level || 'L2'
      })
    });

    const obfuscatorResult = await obfuscatorResponse.json();

    if (!obfuscatorResult.success) {
      return errorResponse(
        'INTERNAL_ERROR',
        obfuscatorResult.error || 'Obfuscation failed',
        500,
        undefined,
        rateResult
      );
    }

    // Record usage
    if (useCredits) {
      // Deduct credit
      await supabase
        .from('obfuscation_credits')
        .update({ 
          credits: credits - 1,
          updated_at: new Date().toISOString()
        })
        .eq('developer_id', auth.developerId);

      await supabase
        .from('obfuscation_usage')
        .insert({
          developer_id: auth.developerId,
          period_start: periodStart.toISOString(),
          source: 'credit'
        });
    } else {
      // Record subscription usage
      await supabase
        .from('obfuscation_usage')
        .insert({
          developer_id: auth.developerId,
          period_start: periodStart.toISOString(),
          source: 'subscription'
        });
    }

    // Get updated counts
    const { count: newUsageCount } = await supabase
      .from('obfuscation_usage')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', auth.developerId)
      .eq('source', 'subscription')
      .gte('period_start', periodStart.toISOString());

    const { data: newCreditsData } = await supabase
      .from('obfuscation_credits')
      .select('credits')
      .eq('developer_id', auth.developerId)
      .maybeSingle();

    const response: ObfuscateResponse = {
      obfuscated_code: obfuscatorResult.obfuscated,
      usage: {
        used: newUsageCount || 0,
        limit: tierConfig.obfuscationLimit === -1 ? 'unlimited' : tierConfig.obfuscationLimit,
        period: tierConfig.obfuscationPeriod,
        credits_remaining: newCreditsData?.credits || 0
      }
    };

    return successResponse(response, 200, rateResult);

  } catch (err) {
    console.error('Obfuscate API error:', err);
    return serverError(rateResult);
  }
});
