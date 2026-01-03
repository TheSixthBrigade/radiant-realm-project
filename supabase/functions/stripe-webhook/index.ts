import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    let event
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
    } else {
      event = JSON.parse(body)
    }

    console.log('Stripe webhook received:', event.type)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      console.log('Processing checkout session:', session.id)

      // Update transaction status using stripe_session_id
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', session.id)
        .select()

      if (updateError) {
        console.error('Error updating transaction:', updateError)
      } else {
        console.log('Payment completed:', session.id, 'Updated transactions:', updatedTransaction?.length)
      }

      // Increment product download count if we have the product_id
      if (session.metadata?.product_id) {
        try {
          await supabase.rpc('increment_downloads', { 
            product_id_param: session.metadata.product_id 
          })
          console.log('Download count incremented for product:', session.metadata.product_id)
        } catch (rpcError) {
          console.error('Failed to increment downloads:', rpcError)
          // Fallback method
          try {
            const { data: currentProduct } = await supabase
              .from('products')
              .select('downloads')
              .eq('id', session.metadata.product_id)
              .single()
            
            if (currentProduct) {
              await supabase
                .from('products')
                .update({ downloads: (currentProduct.downloads || 0) + 1 })
                .eq('id', session.metadata.product_id)
              console.log('Download count incremented via fallback method')
            }
          } catch (fallbackError) {
            console.error('Fallback download increment failed:', fallbackError)
          }
        }
      }
    }

    // Handle Connect account updates
    if (event.type === 'account.updated') {
      const account = event.data.object
      console.log('Processing account update:', account.id)
      console.log('Account details:', {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled
      })
      
      // Update profile with account status using correct field names
      // Account is considered "connected" when it can accept charges and receive payouts
      const isConnected = account.charges_enabled && account.payouts_enabled
      
      const { error: accountUpdateError } = await supabase
        .from('profiles')
        .update({
          stripe_connect_status: isConnected ? 'connected' : 'pending'
        })
        .eq('stripe_connect_account_id', account.id)

      if (accountUpdateError) {
        console.error('Error updating account status:', accountUpdateError)
      } else {
        console.log('Account updated:', account.id, 'status set to:', isConnected ? 'connected' : 'pending')
      }
    }

    // Handle payment intent succeeded (for destination charges)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      console.log('Payment intent succeeded:', paymentIntent.id)
      
      // This confirms the destination charge worked and funds were split
      if (paymentIntent.transfer_data?.destination) {
        console.log('Funds transferred to:', paymentIntent.transfer_data.destination)
        console.log('Application fee:', paymentIntent.application_fee_amount)
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
