// Authentication middleware for Developer API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DeveloperContext, SubscriptionTier, TIERS } from './types.ts'

export async function authenticateRequest(
  req: Request
): Promise<DeveloperContext | null> {
  const apiKey = req.headers.get('X-API-Key');
  
  if (!apiKey) {
    return null;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Look up the API key
  const { data: keyData, error: keyError } = await supabase
    .from('developer_api_keys')
    .select('developer_id, is_active')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (keyError || !keyData || !keyData.is_active) {
    return null;
  }

  // Update last used timestamp
  await supabase
    .from('developer_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('api_key', apiKey);

  // Get subscription tier
  const { data: subData } = await supabase
    .from('developer_subscriptions')
    .select('tier')
    .eq('developer_id', keyData.developer_id)
    .maybeSingle();

  const tier: SubscriptionTier = (subData?.tier as SubscriptionTier) || 'free';
  const tierConfig = TIERS[tier];

  return {
    developerId: keyData.developer_id,
    apiKey: apiKey,
    tier: tier,
    rateLimit: tierConfig.rateLimit
  };
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'vb_';
  let key = prefix;
  
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return key;
}
