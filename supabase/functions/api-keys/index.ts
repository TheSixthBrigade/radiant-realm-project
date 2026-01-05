import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateApiKey } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user from auth header (standard Supabase auth, not API key)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const keyId = pathParts.length > 2 ? pathParts[2] : null;

  try {
    // GET - List all API keys
    if (req.method === 'GET' && !keyId) {
      const { data, error } = await supabase
        .from('developer_api_keys')
        .select('id, name, created_at, last_used_at, is_active')
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mask the actual keys - only show prefix
      return new Response(
        JSON.stringify({
          success: true,
          data: { keys: data || [] },
          request_id: crypto.randomUUID()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create new API key
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const name = body.name?.trim() || 'Default';

      // Check limit (max 5 keys per user)
      const { count } = await supabase
        .from('developer_api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', user.id);

      if ((count || 0) >= 5) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'TIER_LIMIT_EXCEEDED', message: 'Maximum 5 API keys allowed' },
            request_id: crypto.randomUUID()
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('developer_api_keys')
        .select('id')
        .eq('developer_id', user.id)
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'DUPLICATE_GROUP', message: 'Key with this name already exists' },
            request_id: crypto.randomUUID()
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = generateApiKey();

      const { data, error } = await supabase
        .from('developer_api_keys')
        .insert({
          developer_id: user.id,
          api_key: apiKey,
          name: name
        })
        .select('id, name, created_at, is_active')
        .single();

      if (error) throw error;

      // Return the full key only on creation
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...data,
            api_key: apiKey // Only shown once!
          },
          request_id: crypto.randomUUID()
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Revoke API key
    if (req.method === 'DELETE' && keyId) {
      const { data: existing } = await supabase
        .from('developer_api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('developer_id', user.id)
        .maybeSingle();

      if (!existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'API key not found' },
            request_id: crypto.randomUUID()
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('developer_api_keys')
        .delete()
        .eq('id', keyId);

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('API Keys error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' },
        request_id: crypto.randomUUID()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
