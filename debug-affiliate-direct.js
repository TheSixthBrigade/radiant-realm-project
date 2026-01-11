/**
 * Debug script to check affiliate data directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debug() {
  console.log('=== Direct Affiliate Debug ===\n');

  // Check affiliate_links with specific code from screenshot
  const refCode = 'GWP3CDYP'; // From the screenshot
  
  console.log(`Looking for affiliate link with code: ${refCode}`);
  
  const { data: link, error: linkError } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('code', refCode)
    .single();

  if (linkError) {
    console.log('Error:', linkError.message);
    console.log('Error code:', linkError.code);
  } else {
    console.log('Found link:', link);
  }

  // Try to get ALL links without filter
  console.log('\nFetching all affiliate_links...');
  const { data: allLinks, error: allError, count } = await supabase
    .from('affiliate_links')
    .select('*', { count: 'exact' });

  if (allError) {
    console.log('Error fetching all:', allError.message);
  } else {
    console.log(`Total links found: ${allLinks?.length}`);
    console.log('Links:', allLinks);
  }

  // Check if the table exists by trying to get count
  console.log('\nChecking table structure...');
  const { error: structError } = await supabase
    .from('affiliate_links')
    .select('id')
    .limit(1);

  if (structError) {
    console.log('Table access error:', structError.message);
  } else {
    console.log('Table is accessible');
  }
}

debug().catch(console.error);
