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

    // Check product 2c240cb3-4e85-4365-8715-c4eb70b509e2
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', '2c240cb3-4e85-4365-8715-c4eb70b509e2')
      .single()

    // Check who john is
    const { data: johnStore } = await supabase
      .from('stores')
      .select('*, profiles(*)')
      .eq('slug', 'john')
      .single()

    return new Response(JSON.stringify({ 
      product,
      johnStore,
      productCreatorId: product?.creator_id,
      johnUserId: johnStore?.user_id,
      match: product?.creator_id === johnStore?.user_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
