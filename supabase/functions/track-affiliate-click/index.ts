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

    const { ref_code } = await req.json()

    if (!ref_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Referral code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find the affiliate link
    const { data: link, error: linkError } = await supabase
      .from('affiliate_links')
      .select('id, creator_id, clicks')
      .eq('code', ref_code.toUpperCase())
      .single()

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid referral code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if affiliate program is enabled for this creator
    const { data: settings } = await supabase
      .from('affiliate_settings')
      .select('is_enabled, cookie_days')
      .eq('creator_id', link.creator_id)
      .single()

    if (!settings?.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Affiliate program not active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment click count
    const { error: updateError } = await supabase
      .from('affiliate_links')
      .update({ clicks: (link.clicks || 0) + 1 })
      .eq('id', link.id)

    if (updateError) {
      console.error('Error updating click count:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        cookie_days: settings.cookie_days || 30,
        creator_id: link.creator_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Affiliate click tracking error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
