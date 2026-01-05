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
import { CREDIT_PRICE_GBP } from '../_shared/types.ts'

// Price per credit in pence (£1 = 100p)
const CREDIT_PRICE_PENCE = CREDIT_PRICE_GBP * 100;

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
    // GET - Get current credit balance
    if (req.method === 'GET') {
      const { data } = await supabase
        .from('obfuscation_credits')
        .select('credits, updated_at')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      return successResponse({
        credits: data?.credits || 0,
        price_per_credit_gbp: CREDIT_PRICE_GBP,
        last_updated: data?.updated_at || null
      }, 200, rateResult);
    }

    // POST - Purchase credits
    if (req.method === 'POST') {
      const body = await req.json();
      const quantity = parseInt(body.quantity);

      if (!quantity || quantity < 1 || quantity > 100) {
        return badRequest('Quantity must be between 1 and 100', { quantity: 'Invalid' }, rateResult);
      }

      // Get or create Stripe customer
      const { data: sub } = await supabase
        .from('developer_subscriptions')
        .select('stripe_customer_id')
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      let customerId = sub?.stripe_customer_id;

      if (!customerId) {
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

      // Create one-time payment session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Obfuscation Credits',
              description: `${quantity} obfuscation credit${quantity > 1 ? 's' : ''}`
            },
            unit_amount: CREDIT_PRICE_PENCE
          },
          quantity: quantity
        }],
        success_url: `${req.headers.get('origin')}/developer/api?credits=success&quantity=${quantity}`,
        cancel_url: `${req.headers.get('origin')}/developer/api?credits=cancelled`,
        metadata: {
          developer_id: auth.developerId,
          credit_quantity: quantity.toString(),
          type: 'credit_purchase'
        }
      });

      return successResponse({
        checkout_url: session.url,
        quantity: quantity,
        total_gbp: quantity * CREDIT_PRICE_GBP
      }, 200, rateResult);
    }

    return badRequest('Invalid method', undefined, rateResult);

  } catch (err) {
    console.error('Credits API error:', err);
    return serverError(rateResult);
  }
});
