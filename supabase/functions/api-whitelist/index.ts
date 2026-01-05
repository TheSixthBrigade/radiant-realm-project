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
import { AddWhitelistRequest, TIERS } from '../_shared/types.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return unauthorized();
  }

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
  const whitelistId = pathParts.length > 2 ? pathParts[2] : null;
  const isBulkRemove = pathParts[2] === 'bulk-remove';

  try {
    // GET /api-whitelist?product_id=xxx - List whitelist entries
    if (req.method === 'GET') {
      const productId = url.searchParams.get('product_id');
      if (!productId) {
        return badRequest('product_id is required', { product_id: 'Required' }, rateResult);
      }

      // Verify product ownership
      const { data: product } = await supabase
        .from('developer_products')
        .select('id')
        .eq('id', productId)
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (!product) {
        return notFound('Product', rateResult);
      }

      // Pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      // Build query
      let query = supabase
        .from('whitelist_entries')
        .select('*', { count: 'exact' })
        .eq('product_id', productId);

      // Filters
      const robloxUserId = url.searchParams.get('roblox_user_id');
      const discordId = url.searchParams.get('discord_id');
      
      if (robloxUserId) {
        query = query.eq('roblox_user_id', parseInt(robloxUserId));
      }
      if (discordId) {
        query = query.eq('discord_id', discordId);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const tierConfig = TIERS[auth.tier];
      const tierLimit = tierConfig.whitelistLimit === -1 ? 'unlimited' : tierConfig.whitelistLimit;

      return successResponse({
        entries: data || [],
        total: count || 0,
        page,
        limit,
        tier_limit: tierLimit
      }, 200, rateResult);
    }

    // POST /api-whitelist - Add/update whitelist entry
    if (req.method === 'POST' && !isBulkRemove) {
      const body: AddWhitelistRequest = await req.json();

      // Validate
      const errors: Record<string, string> = {};
      if (!body.product_id) errors.product_id = 'Required';
      if (!body.roblox_user_id || typeof body.roblox_user_id !== 'number') {
        errors.roblox_user_id = 'Required and must be a number';
      }
      if (!body.discord_id?.trim()) errors.discord_id = 'Required';
      if (!body.expiry_date) errors.expiry_date = 'Required';

      if (Object.keys(errors).length > 0) {
        return badRequest('Validation failed', errors, rateResult);
      }

      // Check expiry date is in future
      const expiryDate = new Date(body.expiry_date);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return errorResponse('INVALID_EXPIRY', 'Expiry date must be in the future', 400, undefined, rateResult);
      }

      // Verify product ownership
      const { data: product } = await supabase
        .from('developer_products')
        .select('id')
        .eq('id', body.product_id)
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (!product) {
        return notFound('Product', rateResult);
      }

      // Check tier limit (only for new entries)
      const tierConfig = TIERS[auth.tier];
      if (tierConfig.whitelistLimit !== -1) {
        const { count } = await supabase
          .from('whitelist_entries')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', body.product_id);

        // Check if this is a new entry or update
        const { data: existingEntry } = await supabase
          .from('whitelist_entries')
          .select('id')
          .eq('product_id', body.product_id)
          .eq('roblox_user_id', body.roblox_user_id)
          .maybeSingle();

        if (!existingEntry && (count || 0) >= tierConfig.whitelistLimit) {
          return errorResponse(
            'TIER_LIMIT_EXCEEDED',
            `Whitelist limit reached (${tierConfig.whitelistLimit} users). Upgrade your plan for more.`,
            403,
            undefined,
            rateResult
          );
        }
      }

      // Upsert entry
      const { data, error } = await supabase
        .from('whitelist_entries')
        .upsert({
          product_id: body.product_id,
          roblox_user_id: body.roblox_user_id,
          discord_id: body.discord_id.trim(),
          expiry_date: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_id,roblox_user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return successResponse(data, 201, rateResult);
    }

    // POST /api-whitelist/bulk-remove - Bulk remove entries
    if (req.method === 'POST' && isBulkRemove) {
      const body = await req.json();
      const ids: string[] = body.whitelist_ids || [];

      if (!Array.isArray(ids) || ids.length === 0) {
        return badRequest('whitelist_ids array is required', undefined, rateResult);
      }

      // Get entries that belong to this developer's products
      const { data: validEntries } = await supabase
        .from('whitelist_entries')
        .select('id, product_id')
        .in('id', ids);

      const validIds: string[] = [];
      const failedIds: string[] = [];

      for (const id of ids) {
        const entry = validEntries?.find(e => e.id === id);
        if (!entry) {
          failedIds.push(id);
          continue;
        }

        // Verify ownership
        const { data: product } = await supabase
          .from('developer_products')
          .select('id')
          .eq('id', entry.product_id)
          .eq('developer_id', auth.developerId)
          .maybeSingle();

        if (product) {
          validIds.push(id);
        } else {
          failedIds.push(id);
        }
      }

      // Delete valid entries
      if (validIds.length > 0) {
        await supabase
          .from('whitelist_entries')
          .delete()
          .in('id', validIds);
      }

      return successResponse({
        removed: validIds.length,
        failed: failedIds
      }, 200, rateResult);
    }

    // DELETE /api-whitelist/:id - Remove single entry
    if (req.method === 'DELETE' && whitelistId) {
      // Get entry
      const { data: entry } = await supabase
        .from('whitelist_entries')
        .select('id, product_id')
        .eq('id', whitelistId)
        .maybeSingle();

      if (!entry) {
        return notFound('Whitelist entry', rateResult);
      }

      // Verify ownership through product
      const { data: product } = await supabase
        .from('developer_products')
        .select('id')
        .eq('id', entry.product_id)
        .eq('developer_id', auth.developerId)
        .maybeSingle();

      if (!product) {
        return notFound('Whitelist entry', rateResult);
      }

      await supabase
        .from('whitelist_entries')
        .delete()
        .eq('id', whitelistId);

      return new Response(null, { status: 204 });
    }

    return badRequest('Invalid request', undefined, rateResult);

  } catch (err) {
    console.error('Whitelist API error:', err);
    return serverError(rateResult);
  }
});
