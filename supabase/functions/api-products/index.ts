import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { 
  successResponse, 
  errorResponse, 
  corsResponse, 
  unauthorized, 
  rateLimited, 
  notFound, 
  badRequest,
  serverError 
} from '../_shared/response.ts'
import { CreateProductRequest, Product } from '../_shared/types.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  // Authenticate
  const auth = await authenticateRequest(req);
  if (!auth) {
    return unauthorized();
  }

  // Rate limit
  const rateResult = checkRateLimit(auth.apiKey, auth.rateLimit);
  if (!rateResult.allowed) {
    return rateLimited(rateResult);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const productId = pathParts.length > 2 ? pathParts[2] : null;

  try {
    // GET /api-products - List all products
    if (req.method === 'GET' && !productId) {
      const { data, error } = await supabase
        .from('developer_products')
        .select('*')
        .eq('developer_id', auth.developerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return successResponse({ products: data || [], total: data?.length || 0 }, 200, rateResult);
    }

    // GET /api-products/:id - Get single product
    if (req.method === 'GET' && productId) {
      const { data, error } = await supabase
        .from('developer_products')
        .select('*')
        .eq('id', productId)
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return notFound('Product', rateResult);

      return successResponse(data, 200, rateResult);
    }

    // POST /api-products - Create product
    if (req.method === 'POST') {
      const body: CreateProductRequest = await req.json();

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!body.product_name?.trim()) {
        errors.product_name = 'Required';
      }
      if (!body.roblox_group_id || typeof body.roblox_group_id !== 'number') {
        errors.roblox_group_id = 'Required and must be a number';
      }

      if (Object.keys(errors).length > 0) {
        return badRequest('Validation failed', errors, rateResult);
      }

      // Check for duplicate group ID
      const { data: existing } = await supabase
        .from('developer_products')
        .select('id')
        .eq('developer_id', auth.developerId)
        .eq('roblox_group_id', body.roblox_group_id)
        .maybeSingle();

      if (existing) {
        return errorResponse(
          'DUPLICATE_GROUP',
          'You already have a product for this Roblox group',
          409,
          undefined,
          rateResult
        );
      }

      // Create product
      const { data, error } = await supabase
        .from('developer_products')
        .insert({
          developer_id: auth.developerId,
          product_name: body.product_name.trim(),
          roblox_group_id: body.roblox_group_id,
          description: body.description?.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      return successResponse(data, 201, rateResult);
    }

    // DELETE /api-products/:id - Delete product
    if (req.method === 'DELETE' && productId) {
      // Check ownership
      const { data: existing } = await supabase
        .from('developer_products')
        .select('id')
        .eq('id', productId)
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (!existing) {
        return notFound('Product', rateResult);
      }

      // Delete (cascades to whitelist_entries)
      const { error } = await supabase
        .from('developer_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      return new Response(null, { status: 204 });
    }

    return badRequest('Invalid request method', undefined, rateResult);

  } catch (err) {
    console.error('Product API error:', err);
    return serverError(rateResult);
  }
});
