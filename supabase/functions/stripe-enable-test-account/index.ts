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
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId is required')
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user's Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, display_name')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile?.stripe_connect_account_id) {
      throw new Error('No Stripe account found for this user')
    }

    const accountId = profile.stripe_connect_account_id

    console.log(`Enabling test account capabilities for ${profile.display_name} (${accountId})`)

    // In test mode, we can update the account to enable capabilities
    // This simulates a fully onboarded account
    try {
      const account = await stripe.accounts.update(accountId, {
        // Enable card payments capability
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Add minimal required information for test mode
        business_type: 'individual',
        individual: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '+15555551234',
          address: {
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postal_code: '90210',
            country: 'US',
          },
          dob: {
            day: 1,
            month: 1,
            year: 1990,
          },
          ssn_last_4: '0000',
        },
        business_profile: {
          mcc: '5734', // Computer software stores
          url: 'https://example.com',
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '127.0.0.1',
        },
      })

      console.log('Account updated:', {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      })

      // Update our database status
      const isConnected = account.charges_enabled && account.payouts_enabled
      await supabase
        .from('profiles')
        .update({
          stripe_connect_status: isConnected ? 'connected' : 'pending'
        })
        .eq('user_id', userId)

      return new Response(
        JSON.stringify({
          success: true,
          account_id: accountId,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          status: isConnected ? 'connected' : 'pending',
          message: isConnected ? 'Account fully enabled!' : 'Account updated but still pending approval'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      
      // If updating fails, try to just check the current status
      const account = await stripe.accounts.retrieve(accountId)
      const isConnected = account.charges_enabled && account.payouts_enabled
      
      await supabase
        .from('profiles')
        .update({
          stripe_connect_status: isConnected ? 'connected' : 'pending'
        })
        .eq('user_id', userId)

      return new Response(
        JSON.stringify({
          success: true,
          account_id: accountId,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          status: isConnected ? 'connected' : 'pending',
          message: 'Account status refreshed',
          note: 'Could not update account details, but status has been refreshed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error enabling test account:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})