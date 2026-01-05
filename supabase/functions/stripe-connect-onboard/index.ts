import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Parse request body for return/refresh URLs
    const body = await req.json().catch(() => ({}))
    const origin = req.headers.get('origin') || 'http://localhost:8080'
    const returnUrl = body.return_url || `${origin}/onboarding?stripe_return=true`
    const refreshUrl = body.refresh_url || `${origin}/onboarding?stripe_refresh=true`

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('Stripe credentials not configured. Please contact support.')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user already has a Stripe Connect account
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_status, business_name')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw new Error('Failed to fetch profile')
    }

    let accountId = profile?.stripe_connect_account_id

    // Create account only if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_profile: {
          name: profile?.business_name || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          user_id: user.id,
          platform: 'vectabase',
        },
      })
      
      accountId = account.id

      // Save the account ID to database
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: 'pending'
        })
        .eq('user_id', user.id)
      
      if (updateError) {
        console.error('Database update error:', updateError)
        throw new Error(`Failed to save Stripe account: ${updateError.message}`)
      }
    }

    // Create account link for onboarding (works for new or existing accounts)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        success: true,
        url: accountLink.url,
        accountId: accountId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in stripe-connect-onboard:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
