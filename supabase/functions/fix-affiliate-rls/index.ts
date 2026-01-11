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

    // Get all affiliate data
    const { data: links } = await supabase
      .from('affiliate_links')
      .select('*')

    const { data: referrals } = await supabase
      .from('affiliate_referrals')
      .select('*')

    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return new Response(JSON.stringify({ 
      links,
      referrals,
      recentSales: sales,
      recentTransactions: transactions
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
