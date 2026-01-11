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
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_status, business_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // If no profile exists, create one
    if (!profile && (!profileError || profileError.code === 'PGRST116')) {
      console.log('Creating profile for user:', user.id)
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select('stripe_connect_account_id, stripe_connect_status, business_name')
        .single()
      
      if (createError) {
        console.error('Failed to create profile:', createError)
        throw new Error(`Failed to create profile: ${createError.message}`)
      }
      profile = newProfile
    } else if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    let accountId = profile?.stripe_connect_account_id
    console.log('User ID:', user.id)
    console.log('Existing account ID:', accountId)

    // Create account only if it doesn't exist
    if (!accountId) {
      console.log('Creating new Stripe Connect account...')
      try {
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
        console.log('Created Stripe account:', accountId)

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
      } catch (stripeError: any) {
        console.error('Stripe account creation error:', stripeError)
        throw new Error(`Stripe error: ${stripeError.message}`)
      }
    } else {
      // Verify the account still exists in Stripe
      console.log('Verifying existing Stripe account:', accountId)
      try {
        const account = await stripe.accounts.retrieve(accountId)
        console.log('Account status:', account.details_submitted ? 'complete' : 'incomplete')
      } catch (retrieveError: any) {
        console.error('Failed to retrieve account:', retrieveError)
        // Account doesn't exist in Stripe anymore, clear it and create new
        if (retrieveError.code === 'account_invalid' || retrieveError.type === 'invalid_request_error') {
          console.log('Account invalid, clearing and creating new...')
          await supabaseAdmin
            .from('profiles')
            .update({
              stripe_connect_account_id: null,
              stripe_connect_status: null
            })
            .eq('user_id', user.id)
          
          // Create new account
          const account = await stripe.accounts.create({
            type: 'express',
            email: user.email,
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
          console.log('Created new Stripe account:', accountId)

          await supabaseAdmin
            .from('profiles')
            .update({
              stripe_connect_account_id: accountId,
              stripe_connect_status: 'pending'
            })
            .eq('user_id', user.id)
        } else {
          throw retrieveError
        }
      }
    }

    // Create account link for onboarding (works for new or existing accounts)
    console.log('Creating account link for:', accountId)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })
    console.log('Account link created successfully')

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
