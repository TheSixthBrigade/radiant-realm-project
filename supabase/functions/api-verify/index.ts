import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts'
import { VerifyRequest, VerifyResponse } from '../_shared/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Public endpoint rate limit (per IP since no API key)
const PUBLIC_RATE_LIMIT = 30; // requests per minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_REQUEST', message: 'POST only' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limit by IP (or forwarded IP)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  
  const rateResult = checkRateLimit(`verify_${clientIp}`, PUBLIC_RATE_LIMIT);
  const rateLimitHeaders = getRateLimitHeaders(rateResult);

  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        request_id: crypto.randomUUID()
      }),
      { 
        status: 429, 
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const body: VerifyRequest = await req.json();

    // Validate
    if (!body.roblox_user_id || typeof body.roblox_user_id !== 'number') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'roblox_user_id is required' },
          request_id: crypto.randomUUID()
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.roblox_group_id || typeof body.roblox_group_id !== 'number') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'roblox_group_id is required' },
          request_id: crypto.randomUUID()
        }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find products with this group ID
    const { data: products } = await supabase
      .from('developer_products')
      .select('id')
      .eq('roblox_group_id', body.roblox_group_id);

    if (!products || products.length === 0) {
      const response: VerifyResponse = { whitelisted: false };
      return new Response(
        JSON.stringify({ success: true, data: response, request_id: crypto.randomUUID() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productIds = products.map(p => p.id);

    // Check for active whitelist entry
    const { data: entry } = await supabase
      .from('whitelist_entries')
      .select('expiry_date')
      .in('product_id', productIds)
      .eq('roblox_user_id', body.roblox_user_id)
      .gt('expiry_date', new Date().toISOString())
      .order('expiry_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const response: VerifyResponse = entry
      ? { whitelisted: true, expiry_date: entry.expiry_date }
      : { whitelisted: false };

    return new Response(
      JSON.stringify({ success: true, data: response, request_id: crypto.randomUUID() }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Verify API error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' },
        request_id: crypto.randomUUID()
      }),
      { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
