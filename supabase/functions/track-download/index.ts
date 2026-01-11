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

    const { product_id, version_id, user_id } = await req.json()

    if (!product_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID and User ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get client info
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     null
    const userAgent = req.headers.get('user-agent') || null

    // Record download event
    const { data: downloadEvent, error: downloadError } = await supabase
      .from('download_events')
      .insert({
        product_id,
        version_id: version_id || null,
        user_id,
        ip_address: clientIP,
        user_agent: userAgent
      })
      .select('id')
      .single()

    if (downloadError) {
      console.error('Error recording download:', downloadError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record download' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Check if this is a first download or re-download
    const { count } = await supabase
      .from('download_events')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)
      .eq('user_id', user_id)

    const isFirstDownload = count === 1

    return new Response(
      JSON.stringify({
        success: true,
        download_id: downloadEvent.id,
        is_first_download: isFirstDownload
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Download tracking error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
