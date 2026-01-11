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

    const { license_key, machine_id, product_id } = await req.json()

    if (!license_key) {
      return new Response(
        JSON.stringify({ valid: false, error: 'License key is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find the license
    let query = supabase
      .from('license_keys')
      .select('*, product:products(title, license_enabled, max_activations)')
      .eq('key', license_key.toUpperCase())

    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    const { data: license, error: licenseError } = await query.single()

    if (licenseError || !license) {
      return new Response(
        JSON.stringify({ valid: false, error: 'License key not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check license status
    if (license.status === 'revoked') {
      return new Response(
        JSON.stringify({ valid: false, error: 'License has been revoked', status: 'revoked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check expiration
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'License has expired', status: 'expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check max activations
    const maxActivations = license.max_activations || license.product?.max_activations
    if (maxActivations && license.activations >= maxActivations) {
      // Check if this machine is already activated
      if (machine_id) {
        const { data: existingActivation } = await supabase
          .from('license_activations')
          .select('id')
          .eq('license_id', license.id)
          .eq('machine_id', machine_id)
          .is('deactivated_at', null)
          .single()

        if (!existingActivation) {
          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: 'Maximum activations reached', 
              status: 'max_activations',
              activations: license.activations,
              max_activations: maxActivations
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // If machine_id provided, record/update activation
    if (machine_id) {
      // Check if already activated on this machine
      const { data: existingActivation } = await supabase
        .from('license_activations')
        .select('id')
        .eq('license_id', license.id)
        .eq('machine_id', machine_id)
        .is('deactivated_at', null)
        .single()

      if (!existingActivation) {
        // Get client IP
        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                         req.headers.get('x-real-ip') || 
                         null

        // Create new activation
        await supabase
          .from('license_activations')
          .insert({
            license_id: license.id,
            machine_id,
            ip_address: clientIP
          })

        // Increment activation count
        await supabase
          .from('license_keys')
          .update({ activations: license.activations + 1 })
          .eq('id', license.id)
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        status: 'active',
        product_id: license.product_id,
        product_name: license.product?.title,
        activations: license.activations,
        max_activations: maxActivations || null,
        expires_at: license.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('License verification error:', error)
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
