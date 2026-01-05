// Vectabase Lua Obfuscator Edge Function
// This function receives Lua code and returns obfuscated code
// For production, this would call the Python obfuscator on a backend server

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple client-side compatible obfuscation (for demo)
// In production, this would call your Python obfuscator via HTTP
function obfuscateCode(code: string, level: string): string {
  if (!code.trim()) return '';
  
  // Variable name obfuscation
  const varNames = code.match(/local\s+(\w+)/g) || [];
  let obfuscated = code;
  const varMap: Record<string, string> = {};
  
  varNames.forEach((match) => {
    const name = match.replace('local ', '');
    if (!varMap[name]) {
      varMap[name] = `_0x${Math.random().toString(16).slice(2, 6)}`;
    }
  });
  
  Object.entries(varMap).forEach(([original, obf]) => {
    obfuscated = obfuscated.replace(new RegExp(`\\b${original}\\b`, 'g'), obf);
  });

  // String encoding for medium/heavy
  if (level === 'L2' || level === 'L3' || level === 'medium' || level === 'heavy') {
    obfuscated = obfuscated.replace(/"([^"]+)"/g, (_, str: string) => {
      const encoded = str.split('').map((c: string) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
      return `"${encoded}"`;
    });
  }
  
  // Heavy obfuscation - add junk code
  if (level === 'L1' || level === 'heavy') {
    const junk = `\n-- ${Math.random().toString(36).slice(2)}\nlocal _junk${Math.floor(Math.random()*1000)} = nil\n`;
    obfuscated = junk + obfuscated + junk;
  }
  
  // Add header
  const levelName = level === 'L1' ? 'Max Security' : level === 'L2' ? 'Balanced' : level === 'L3' ? 'Performance' : level;
  const header = `--[[\n  Protected by Vectabase Obfuscator\n  Level: ${levelName}\n  https://vectabase.com/developer\n  Generated: ${new Date().toISOString()}\n]]\n\n`;
  
  return header + obfuscated;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, level = 'L2' } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate level
    const validLevels = ['L1', 'L2', 'L3', 'light', 'medium', 'heavy'];
    if (!validLevels.includes(level)) {
      return new Response(
        JSON.stringify({ error: 'Invalid level. Use L1, L2, or L3' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const obfuscated = obfuscateCode(code, level);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        obfuscated,
        inputSize: code.length,
        outputSize: obfuscated.length,
        level
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Obfuscation error:', error);
    return new Response(
      JSON.stringify({ error: 'Obfuscation failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
