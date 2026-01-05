import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Clean tier pricing in pence (GBP) - fees added at Stripe checkout
const TIER_PRICING = {
  pro: { 
    amount: 700, // £7/month
    name: 'Vectabase Pro', 
    description: '20 obfuscations/day, 100 whitelist entries, 30 req/min',
    obfuscations_per_day: 20
  },
  pro_plus: { 
    amount: 1400, // £14/month
    name: 'Vectabase Pro+', 
    description: 'Unlimited obfuscations, 500 whitelist entries, 60 req/min',
    obfuscations_per_day: -1 // unlimited
  },
  enterprise: { 
    amount: 2500, // £25/month
    name: 'Vectabase Enterprise', 
    description: 'Unlimited obfuscations, unlimited whitelist, 120 req/min',
    obfuscations_per_day: -1 // unlimited
  }
}

// Credit pricing in cents (USD) - $1 per credit like Luraph
const CREDIT_PRICE_CENTS = 100; // $1 per credit

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session', details: userError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Admin client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Stripe client
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Parse request body
    const { type, tier, quantity } = await req.json()
    console.log('Request:', { type, tier, quantity })

    // Get existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('developer_subscriptions')
      .select('stripe_customer_id')
      .eq('developer_id', user.id)
      .maybeSingle()

    let customerId = existingSub?.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      console.log('Creating Stripe customer for:', user.email)
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { developer_id: user.id }
      })
      customerId = customer.id
      console.log('Created customer:', customerId)

      // Save to DB
      await supabaseAdmin
        .from('developer_subscriptions')
        .upsert({
          developer_id: user.id,
          stripe_customer_id: customerId,
          tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'developer_id' })
    }

    const origin = req.headers.get('origin') || 'https://vectabase.com'

    // Handle subscription
    if (type === 'subscription') {
      const tierConfig = TIER_PRICING[tier as keyof typeof TIER_PRICING]
      if (!tierConfig) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid tier: ' + tier }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      console.log('Creating subscription checkout for tier:', tier, 'amount:', tierConfig.amount)

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: { 
              name: tierConfig.name, 
              description: tierConfig.description 
            },
            unit_amount: tierConfig.amount,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }],
        success_url: `${origin}/developer/api?subscription=success&tier=${tier}`,
        cancel_url: `${origin}/developer/api?subscription=cancelled`,
        metadata: { developer_id: user.id, tier }
      })

      console.log('Session created:', session.id)

      return new Response(
        JSON.stringify({ success: true, checkout_url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Handle credits (USD pricing like Luraph)
    if (type === 'credits') {
      const qty = Math.min(100, Math.max(1, parseInt(quantity) || 10))
      const totalCents = CREDIT_PRICE_CENTS * qty;
      console.log('Creating credits checkout for quantity:', qty, 'total cents:', totalCents)

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { 
              name: 'Obfuscation Credits', 
              description: `${qty} credit${qty > 1 ? 's' : ''} (1 credit = 1 obfuscation)` 
            },
            unit_amount: CREDIT_PRICE_CENTS
          },
          quantity: qty
        }],
        success_url: `${origin}/developer/api?credits=success`,
        cancel_url: `${origin}/developer/api?credits=cancelled`,
        metadata: { developer_id: user.id, credit_quantity: qty.toString(), type: 'credit_purchase' }
      })

      console.log('Session created:', session.id)

      return new Response(
        JSON.stringify({ success: true, checkout_url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid type: ' + type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message, details: error.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
