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
        const productId = session.metadata.product_id
        
        try {
          await supabase.rpc('increment_downloads', { 
            product_id_param: productId 
          })
          console.log('Download count incremented for product:', productId)
        } catch (rpcError) {
          console.error('Failed to increment downloads:', rpcError)
          // Fallback method
          try {
            const { data: currentProduct } = await supabase
              .from('products')
              .select('downloads')
              .eq('id', productId)
              .single()
            
            if (currentProduct) {
              await supabase
                .from('products')
                .update({ downloads: (currentProduct.downloads || 0) + 1 })
                .eq('id', productId)
              console.log('Download count incremented via fallback method')
            }
          } catch (fallbackError) {
            console.error('Fallback download increment failed:', fallbackError)
          }
        }
        
        // Create sales record for analytics
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const buyerId = session.metadata?.buyer_id || session.client_reference_id || null
        let saleId = null
        
        try {
          const { data: saleData, error: salesError } = await supabase
            .from('sales')
            .insert({
              product_id: productId,
              buyer_id: buyerId,
              seller_id: session.metadata?.seller_id || null,
              amount: amount,
              currency: session.currency || 'usd',
              stripe_payment_id: session.payment_intent,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single()
          
          if (salesError) {
            console.error('Error creating sales record:', salesError)
          } else {
            saleId = saleData?.id
            console.log('Sales record created for product:', productId, 'amount:', amount)
          }
        } catch (salesErr) {
          console.error('Failed to create sales record:', salesErr)
        }

        // Generate license key if product has licensing enabled
        if (saleId && buyerId) {
          try {
            const { data: product } = await supabase
              .from('products')
              .select('license_enabled, max_activations')
              .eq('id', productId)
              .single()

            if (product?.license_enabled) {
              // Generate license key: XXXX-XXXX-XXXX-XXXX
              const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
              const segments = []
              for (let i = 0; i < 4; i++) {
                let segment = ''
                for (let j = 0; j < 4; j++) {
                  segment += chars.charAt(Math.floor(Math.random() * chars.length))
                }
                segments.push(segment)
              }
              const licenseKey = segments.join('-')

              const { error: licenseError } = await supabase
                .from('license_keys')
                .insert({
                  product_id: productId,
                  sale_id: saleId,
                  user_id: buyerId,
                  key: licenseKey,
                  status: 'active',
                  max_activations: product.max_activations
                })

              if (licenseError) {
                console.error('Error creating license key:', licenseError)
              } else {
                console.log('License key generated:', licenseKey)
              }
            }
          } catch (licenseErr) {
            console.error('Failed to generate license key:', licenseErr)
          }
        }

        // Handle affiliate referral tracking
        const refCode = session.metadata?.affiliate_ref
        console.log('Checking affiliate ref:', refCode, 'saleId:', saleId)
        
        // Track affiliate even without saleId - use product price for commission
        if (refCode && refCode !== '' && refCode !== 'null') {
          try {
            console.log('Looking up affiliate link for code:', refCode)
            
            // Find the affiliate link
            const { data: affiliateLink, error: linkError } = await supabase
              .from('affiliate_links')
              .select('id, creator_id, conversions, earnings')
              .eq('code', refCode)
              .single()

            console.log('Affiliate link lookup result:', affiliateLink, 'error:', linkError)

            if (affiliateLink) {
              // Get affiliate settings for commission rate
              const { data: settings, error: settingsError } = await supabase
                .from('affiliate_settings')
                .select('commission_rate')
                .eq('creator_id', affiliateLink.creator_id)
                .single()

              console.log('Affiliate settings:', settings, 'error:', settingsError)

              const commissionRate = settings?.commission_rate || 0.1
              const commissionAmount = amount * commissionRate

              console.log('Commission calculation - rate:', commissionRate, 'amount:', amount, 'commission:', commissionAmount)

              // Create referral record if we have a saleId
              if (saleId) {
                const { error: referralError } = await supabase
                  .from('affiliate_referrals')
                  .insert({
                    link_id: affiliateLink.id,
                    sale_id: saleId,
                    commission_amount: commissionAmount,
                    status: 'pending'
                  })
                
                if (referralError) {
                  console.error('Error creating referral record:', referralError)
                } else {
                  console.log('Referral record created')
                }
              }

              // Update affiliate link stats directly
              const newConversions = (affiliateLink.conversions || 0) + 1
              const newEarnings = (affiliateLink.earnings || 0) + commissionAmount
              
              const { error: updateError } = await supabase
                .from('affiliate_links')
                .update({
                  conversions: newConversions,
                  earnings: newEarnings
                })
                .eq('id', affiliateLink.id)

              if (updateError) {
                console.error('Error updating affiliate link:', updateError)
              } else {
                console.log('Affiliate link updated - conversions:', newConversions, 'earnings:', newEarnings)
              }

              console.log('Affiliate referral tracked:', refCode, 'commission:', commissionAmount)
            } else {
              console.log('No affiliate link found for code:', refCode)
            }
          } catch (affErr) {
            console.error('Failed to track affiliate referral:', affErr)
          }
        } else {
          console.log('No valid affiliate ref code in metadata')
        }

        // Record discount code usage
        const discountCodeId = session.metadata?.discount_code_id
        const discountAmount = session.metadata?.discount_amount
        if (discountCodeId && saleId) {
          try {
            await supabase
              .from('discount_usage')
              .insert({
                code_id: discountCodeId,
                user_id: buyerId,
                sale_id: saleId,
                discount_amount: parseFloat(discountAmount) || 0
              })

            // Increment usage count
            const { data: currentCode } = await supabase
              .from('discount_codes')
              .select('usage_count')
              .eq('id', discountCodeId)
              .single()

            if (currentCode) {
              await supabase
                .from('discount_codes')
                .update({ usage_count: (currentCode.usage_count || 0) + 1 })
                .eq('id', discountCodeId)
            }

            console.log('Discount code usage recorded:', discountCodeId)
          } catch (discountErr) {
            console.error('Failed to record discount usage:', discountErr)
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
      
      // Determine account status based on Stripe's verification state
      // 'complete' = fully verified and can accept payments + receive payouts
      // 'incomplete' = started but needs more info
      // 'pending' = waiting for Stripe verification
      let status = 'pending'
      if (account.charges_enabled && account.payouts_enabled) {
        status = 'complete'
      } else if (account.details_submitted) {
        status = 'incomplete'
      }
      
      const updateData: Record<string, any> = {
        stripe_connect_status: status
      }
      
      // If complete, also mark onboarding as done
      if (status === 'complete') {
        updateData.onboarding_completed_at = new Date().toISOString()
      }
      
      const { error: accountUpdateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('stripe_connect_account_id', account.id)

      if (accountUpdateError) {
        console.error('Error updating account status:', accountUpdateError)
      } else {
        console.log('Account updated:', account.id, 'status set to:', status)
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
