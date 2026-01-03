import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Checking all Stripe Connect accounts...')

    // Get all profiles with Stripe accounts
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, stripe_account_id, stripe_onboarding_status')
      .not('stripe_account_id', 'is', null)

    if (profilesError) {
      throw new Error(`Database error: ${profilesError.message}`)
    }

    const results = []

    for (const profile of profiles || []) {
      try {
        // Get account details from Stripe
        const account = await stripe.accounts.retrieve(profile.stripe_account_id)
        
        const isConnected = account.charges_enabled && account.payouts_enabled
        const currentStatus = profile.stripe_onboarding_status
        const newStatus = isConnected ? 'connected' : 'pending'
        const shouldUpdate = currentStatus !== newStatus && currentStatus !== 'complete'

        console.log(`Account ${account.id}:`, {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          current_status: currentStatus,
          should_be: newStatus,
          needs_update: shouldUpdate
        })

        if (shouldUpdate) {
          // Update the status in database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              stripe_onboarding_status: newStatus
            })
            .eq('user_id', profile.user_id)

          if (updateError) {
            console.error(`Failed to update ${profile.user_id}:`, updateError.message)
          } else {
            console.log(`Updated ${profile.display_name} to ${newStatus}`)
          }
        }

        results.push({
          user_id: profile.user_id,
          display_name: profile.display_name,
          account_id: profile.stripe_account_id,
          old_status: currentStatus,
          new_status: newStatus,
          updated: shouldUpdate,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        })

      } catch (stripeError) {
        console.error(`Error checking account ${profile.stripe_account_id}:`, stripeError.message)
        results.push({
          user_id: profile.user_id,
          display_name: profile.display_name,
          account_id: profile.stripe_account_id,
          error: stripeError.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking accounts:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})