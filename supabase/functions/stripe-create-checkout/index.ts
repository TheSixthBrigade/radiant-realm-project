import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Stripe fee calculation - Global coverage for UK-based platform
// 
// Official Stripe UK Pricing (from stripe.com/gb/pricing - verified Jan 2026):
// - Standard UK cards: 1.5% + 20p
// - Premium UK cards: 1.9% + 20p  
// - EEA cards: 2.5% + 20p (+2% if currency conversion required)
// - International cards: 3.25% + 20p (+2% if currency conversion required)
//
// Since we charge in USD and settle in GBP, currency conversion ALWAYS applies.
// Worst-case scenario (international non-EEA card with currency conversion):
// - Processing: 3.25%
// - Currency conversion: 2%
// - Total percentage: 5.25%
// - Fixed fee: 20p ≈ $0.25 USD (at ~1.25 USD/GBP rate)
//
// Formula to pass fees to buyer: totalCharge = (amount + fixed) / (1 - rate)
// This ensures seller receives full product price after Stripe deducts fees
function calculateStripeFee(amountCents: number): number {
  // Global worst-case rate: 3.25% (international) + 2% (currency conversion) = 5.25%
  const rate = 0.0525
  // Fixed fee: 25 cents (20p converted to USD at ~1.25 rate)
  const fixedFee = 25
  
  // Calculate total needed so that after Stripe takes fees, we have the original amount
  // Formula: totalNeeded = (amount + fixedFee) / (1 - rate)
  const totalNeeded = Math.ceil((amountCents + fixedFee) / (1 - rate))
  const stripeFee = totalNeeded - amountCents
  
  return stripeFee
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { productId, buyerId } = await req.json()

    console.log('Creating Stripe checkout for product:', productId, 'buyer:', buyerId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle()

    if (productError) {
      console.error('Product error:', productError)
      throw new Error(`Database error: ${productError.message}`)
    }

    if (!product) {
      throw new Error('Product not found')
    }

    console.log('Product found:', product.title, 'Price:', product.price)

    // Get seller info with correct field names
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', product.creator_id)
      .maybeSingle()

    if (sellerError) {
      console.error('Seller error:', sellerError)
      throw new Error(`Database error: ${sellerError.message}`)
    }

    if (!seller) {
      throw new Error('Seller not found')
    }

    // Check if seller has Stripe connected
    if (!seller.stripe_account_id || (seller.stripe_onboarding_status !== 'connected' && seller.stripe_onboarding_status !== 'complete')) {
      throw new Error('Seller has not connected Stripe. Cannot process payment.')
    }

    const destinationAccount = seller.stripe_account_id
    console.log('Using seller Stripe account:', destinationAccount)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // Calculate amounts - Payhip style (buyer pays Stripe fees)
    const productPriceCents = Math.round(product.price * 100)
    const platformFeeCents = Math.round(productPriceCents * 0.05) // 5% platform fee
    const stripeFee = calculateStripeFee(productPriceCents) // Stripe processing fee
    const totalAmountCents = productPriceCents + stripeFee // Buyer pays product + Stripe fees

    console.log('Amounts - Product:', productPriceCents / 100, 'Platform fee:', platformFeeCents / 100, 'Stripe fee:', stripeFee / 100, 'Total:', totalAmountCents / 100)

    // Create Stripe Checkout Session with destination charges (marketplace split)
    // Customized with Vectabse branding
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              ...(product.description && { description: product.description }),
              images: product.image_url ? [product.image_url] : [],
            },
            unit_amount: productPriceCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Processing Fee',
              description: 'Secure payment processing',
            },
            unit_amount: stripeFee,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&product_id=${productId}`,
      cancel_url: `${req.headers.get('origin')}/checkout?product_id=${productId}`,
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: destinationAccount,
        },
        metadata: {
          product_id: productId,
          buyer_id: buyerId,
          seller_id: product.creator_id,
        },
      },
      metadata: {
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.creator_id,
      },
    })

    console.log('Stripe session created:', session.id)

    // Save transaction record with correct field names
    const { error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.creator_id,
        amount: product.price,
        platform_fee: platformFeeCents / 100,
        seller_amount: (productPriceCents - platformFeeCents) / 100,
        payment_method: 'stripe',
        stripe_session_id: session.id,
        status: 'pending',
        payout_status: 'instant_split'
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(`Failed to save transaction: ${insertError.message}`)
    }

    console.log('Transaction saved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        sessionId: session.id, 
        url: session.url,
        breakdown: {
          productPrice: product.price,
          processingFee: stripeFee / 100,
          total: totalAmountCents / 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
