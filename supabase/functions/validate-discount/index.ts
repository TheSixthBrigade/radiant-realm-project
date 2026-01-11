import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { code, product_id, creator_id, cart_total } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Discount code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find the discount code
    const { data: discount, error: discountError } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('creator_id', creator_id)
      .single()

    if (discountError || !discount) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid discount code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if active
    if (!discount.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This code is no longer active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This code has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This code has reached its usage limit' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check minimum purchase
    if (discount.min_purchase && cart_total < discount.min_purchase) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Minimum purchase of $${discount.min_purchase} required` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check product-specific codes
    if (discount.product_ids && discount.product_ids.length > 0) {
      if (product_id && !discount.product_ids.includes(product_id)) {
        return new Response(
          JSON.stringify({ valid: false, error: 'This code cannot be applied to this product' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    if (discount.discount_type === 'percentage') {
      discountAmount = cart_total * (discount.discount_value / 100)
      // Apply max discount cap if set
      if (discount.max_discount && discountAmount > discount.max_discount) {
        discountAmount = discount.max_discount
      }
    } else {
      // Fixed amount
      discountAmount = Math.min(discount.discount_value, cart_total)
    }

    return new Response(
      JSON.stringify({
        valid: true,
        discount_id: discount.id,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        discount_amount: Math.round(discountAmount * 100) / 100,
        final_total: Math.round((cart_total - discountAmount) * 100) / 100,
        message: discount.discount_type === 'percentage' 
          ? `${discount.discount_value}% off applied!`
          : `$${discount.discount_value} off applied!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Discount validation error:', error)
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
