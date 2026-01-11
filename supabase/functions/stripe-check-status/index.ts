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

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('Stripe credentials not configured')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user's profile with Stripe account
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_status')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    if (!profile?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({
          success: true,
          status: null,
          message: 'No Stripe account connected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking Stripe account:', profile.stripe_connect_account_id)

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)
    
    const isComplete = account.charges_enabled && account.payouts_enabled
    const newStatus = isComplete ? 'complete' : (account.details_submitted ? 'pending' : 'incomplete')
    
    console.log('Stripe account status:', {
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      current_db_status: profile.stripe_connect_status,
      new_status: newStatus
    })

    // Update status if changed
    if (profile.stripe_connect_status !== newStatus) {
      const updateData: any = {
        stripe_connect_status: newStatus
      }
      
      // If complete, also set onboarding_completed_at
      if (newStatus === 'complete' && profile.stripe_connect_status !== 'complete') {
        updateData.onboarding_completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update status:', updateError)
        throw new Error(`Failed to update status: ${updateError.message}`)
      }

      console.log('Updated status from', profile.stripe_connect_status, 'to', newStatus)
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        updated: profile.stripe_connect_status !== newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking Stripe status:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
