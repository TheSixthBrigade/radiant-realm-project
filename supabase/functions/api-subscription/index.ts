import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { authenticateRequest } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { 
  successResponse, 
  corsResponse, 
  unauthorized, 
  rateLimited, 
  badRequest,
  serverError 
} from '../_shared/response.ts'
import { TIERS, SubscriptionTier } from '../_shared/types.ts'

// Stripe price IDs (set these in your Stripe dashboard)
const STRIPE_PRICES: Record<Exclude<SubscriptionTier, 'free'>, string> = {
  pro: Deno.env.get('STRIPE_PRICE_PRO') || '',
  pro_plus: Deno.env.get('STRIPE_PRICE_PRO_PLUS') || '',
  enterprise: Deno.env.get('STRIPE_PRICE_ENTERPRISE') || ''
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
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

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  try {
    // GET - Get current subscription status
    if (req.method === 'GET') {
      const { data: sub } = await supabase
        .from('developer_subscriptions')
        .select('*')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      const tier = (sub?.tier as SubscriptionTier) || 'free';
      const tierConfig = TIERS[tier];

      // Get usage stats
      const now = new Date();
      let periodStart: Date;
      
      if (tierConfig.obfuscationPeriod === 'week') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
      } else {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
      }

      const { count: usageCount } = await supabase
        .from('obfuscation_usage')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', auth.developerId)
        .eq('source', 'subscription')
        .gte('period_start', periodStart.toISOString());

      const { data: creditsData } = await supabase
        .from('obfuscation_credits')
        .select('credits')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      return successResponse({
        tier: tier,
        tier_name: tierConfig.name,
        price_gbp: tierConfig.priceGbp,
        obfuscation: {
          used: usageCount || 0,
          limit: tierConfig.obfuscationLimit === -1 ? 'unlimited' : tierConfig.obfuscationLimit,
          period: tierConfig.obfuscationPeriod,
          period_resets: periodStart.toISOString()
        },
        whitelist_limit: tierConfig.whitelistLimit === -1 ? 'unlimited' : tierConfig.whitelistLimit,
        rate_limit: tierConfig.rateLimit,
        credits: creditsData?.credits || 0,
        stripe_subscription_id: sub?.stripe_subscription_id || null,
        current_period_end: sub?.current_period_end || null
      }, 200, rateResult);
    }

    // POST - Create checkout session for upgrade
    if (req.method === 'POST') {
      const body = await req.json();
      const targetTier = body.tier as SubscriptionTier;

      if (!targetTier || targetTier === 'free' || !TIERS[targetTier]) {
        return badRequest('Invalid tier', { tier: 'Must be pro, pro_plus, or enterprise' }, rateResult);
      }

      const priceId = STRIPE_PRICES[targetTier];
      if (!priceId) {
        return badRequest('Tier not available for purchase', undefined, rateResult);
      }

      // Get or create Stripe customer
      const { data: sub } = await supabase
        .from('developer_subscriptions')
        .select('stripe_customer_id')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      let customerId = sub?.stripe_customer_id;

      if (!customerId) {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(auth.developerId);
        
        const customer = await stripe.customers.create({
          email: userData.user?.email,
          metadata: { developer_id: auth.developerId }
        });
        customerId = customer.id;

        await supabase
          .from('developer_subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('developer_id', auth.developerId);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.headers.get('origin')}/developer/api?subscription=success`,
        cancel_url: `${req.headers.get('origin')}/developer/api?subscription=cancelled`,
        metadata: {
          developer_id: auth.developerId,
          tier: targetTier
        }
      });

      return successResponse({ checkout_url: session.url }, 200, rateResult);
    }

    // DELETE - Cancel subscription
    if (req.method === 'DELETE') {
      const { data: sub } = await supabase
        .from('developer_subscriptions')
        .select('stripe_subscription_id')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (!sub?.stripe_subscription_id) {
        return badRequest('No active subscription', undefined, rateResult);
      }

      await stripe.subscriptions.cancel(sub.stripe_subscription_id);

      await supabase
        .from('developer_subscriptions')
        .update({
          tier: 'free',
          stripe_subscription_id: null,
          current_period_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('developer_id', auth.developerId);

      return successResponse({ message: 'Subscription cancelled' }, 200, rateResult);
    }

    return badRequest('Invalid method', undefined, rateResult);

  } catch (err) {
    console.error('Subscription API error:', err);
    return serverError(rateResult);
  }
});
