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
    const { productId, buyerId, affiliateRef, discountCode, discountAmount } = await req.json()

    console.log('Creating Stripe checkout for product:', productId, 'buyer:', buyerId, 'affiliate:', affiliateRef, 'discount:', discountCode, 'discountAmount:', discountAmount)

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
    if (!seller.stripe_connect_account_id || (seller.stripe_connect_status !== 'connected' && seller.stripe_connect_status !== 'complete')) {
      throw new Error('Seller has not connected Stripe. Cannot process payment.')
    }

    const destinationAccount = seller.stripe_connect_account_id
    console.log('Using seller Stripe account:', destinationAccount)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // Calculate amounts - Payhip style (buyer pays Stripe fees, platform collects them)
    // Apply discount if provided
    const originalPriceCents = Math.round(product.price * 100)
    const discountCents = discountAmount ? Math.round(discountAmount * 100) : 0
    const productPriceCents = Math.max(0, originalPriceCents - discountCents)
    
    const platformFeePercent = Math.round(productPriceCents * 0.05) // 5% platform fee
    const stripeFee = calculateStripeFee(productPriceCents + platformFeePercent) // Stripe processing fee on total
    const totalAmountCents = productPriceCents + stripeFee // Buyer pays product + Stripe fees
    
    // CRITICAL: Platform collects BOTH the 5% fee AND the Stripe processing fee
    // This way YOU get the processing fee to cover Stripe's charges
    // Seller receives exactly: productPrice - 5% platform fee
    const totalPlatformFeeCents = platformFeePercent + stripeFee

    console.log('Amounts - Original:', originalPriceCents / 100, 'Discount:', discountCents / 100, 'Product:', productPriceCents / 100, 'Platform 5%:', platformFeePercent / 100, 'Stripe fee:', stripeFee / 100, 'Total platform fee:', totalPlatformFeeCents / 100, 'Total charge:', totalAmountCents / 100)

    // Create Stripe Checkout Session with destination charges (marketplace split)
    // Customized with Vectabase branding
    
    // Validate and truncate image URL if needed (Stripe has URL length limits)
    let productImages: string[] = [];
    if (product.image_url && product.image_url.length < 2000 && product.image_url.startsWith('http')) {
      productImages = [product.image_url];
    }
    
    // Build line items - include discount as negative line item if applied
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title.substring(0, 100), // Stripe limits name to 100 chars
            ...(product.description && { description: product.description.substring(0, 500) }), // Limit description
            ...(productImages.length > 0 && { images: productImages }),
          },
          unit_amount: originalPriceCents,
        },
        quantity: 1,
      },
    ]
    
    // Add discount line item if applicable
    if (discountCents > 0 && discountCode) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Discount (${discountCode})`,
            description: 'Promotional discount applied',
          },
          unit_amount: -discountCents, // Negative amount for discount
        },
        quantity: 1,
      })
    }
    
    // Add processing fee
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Processing Fee',
          description: 'Secure payment processing',
        },
        unit_amount: stripeFee,
      },
      quantity: 1,
    })
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&product_id=${productId}`,
      cancel_url: `${req.headers.get('origin')}/checkout?product_id=${productId}`,
      payment_intent_data: {
        // CRITICAL: Platform fee now includes BOTH 5% + Stripe processing fee
        // This ensures YOU receive the processing fee to cover Stripe's charges
        application_fee_amount: totalPlatformFeeCents,
        transfer_data: {
          destination: destinationAccount,
        },
        metadata: {
          product_id: productId,
          buyer_id: buyerId || 'guest',
          seller_id: product.creator_id,
          affiliate_ref: affiliateRef || '',
          discount_code: discountCode || '',
          discount_amount: discountAmount ? discountAmount.toString() : '0',
        },
      },
      metadata: {
        product_id: productId,
        buyer_id: buyerId || 'guest',
        seller_id: product.creator_id,
        affiliate_ref: affiliateRef || '',
        discount_code: discountCode || '',
        discount_amount: discountAmount ? discountAmount.toString() : '0',
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
        platform_fee: totalPlatformFeeCents / 100, // Total platform fee (5% + processing)
        seller_amount: (productPriceCents - platformFeePercent) / 100, // Seller gets product price minus 5%
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
