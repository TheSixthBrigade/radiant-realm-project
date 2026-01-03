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
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId is required')
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('Stripe credentials not configured. Please contact support.')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user already has a Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    // Create account only if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      
      accountId = account.id

      // Save the account ID to database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          stripe_onboarding_status: 'pending'
        })
        .eq('user_id', userId)
      
      if (updateError) {
        console.error('Database update error:', updateError)
        throw new Error(`Failed to save Stripe account: ${updateError.message}`)
      }
    }

    // Create account link for onboarding (works for new or existing accounts)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get('origin') || 'http://127.0.0.1:8080'}/dashboard?stripe_refresh=true`,
      return_url: `${req.headers.get('origin') || 'http://127.0.0.1:8080'}/dashboard?stripe_success=true`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        success: true,
        onboardingUrl: accountLink.url,
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
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
