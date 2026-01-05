import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_CLIENT_ID = "1452697259463540816";
const DISCORD_CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET");
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN"); // Bot token for server-side checks

// Validate required secrets
if (!DISCORD_CLIENT_SECRET) {
  console.error("DISCORD_CLIENT_SECRET environment variable is required");
}

// Helper to refresh Discord access token
async function refreshDiscordToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// Check if user has admin permissions in a guild using BOT token (Dyno approach)
async function checkUserAdminInGuild(guildId: string, userId: string): Promise<boolean> {
  console.log(`[checkUserAdminInGuild] Checking guild=${guildId}, user=${userId}`);
  
  if (!DISCORD_BOT_TOKEN) {
    console.error("[checkUserAdminInGuild] DISCORD_BOT_TOKEN not set!");
    return false;
  }
  
  // Log first few chars of token for debugging (safe - not the full token)
  console.log(`[checkUserAdminInGuild] Bot token starts with: ${DISCORD_BOT_TOKEN.substring(0, 10)}...`);
  
  try {
    // Get guild info first to check owner
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    
    console.log(`[checkUserAdminInGuild] Guild API response status: ${guildResponse.status}`);
    
    if (!guildResponse.ok) {
      const errorText = await guildResponse.text();
      console.error(`[checkUserAdminInGuild] Failed to get guild: ${errorText}`);
      return false;
    }
    
    const guild = await guildResponse.json();
    console.log(`[checkUserAdminInGuild] Guild name: ${guild.name}, owner_id: ${guild.owner_id}`);
    
    if (guild.owner_id === userId) {
      console.log(`[checkUserAdminInGuild] User is OWNER - returning true`);
      return true; // User is owner
    }
    
    // Get guild member info using bot token
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    
    console.log(`[checkUserAdminInGuild] Member API response status: ${memberResponse.status}`);
    
    if (!memberResponse.ok) {
      const errorText = await memberResponse.text();
      console.error(`[checkUserAdminInGuild] Failed to get member: ${errorText}`);
      // User not in guild or bot doesn't have access
      return false;
    }
    
    const member = await memberResponse.json();
    console.log(`[checkUserAdminInGuild] Member roles: ${JSON.stringify(member.roles)}`);
    
    // Get guild roles to calculate permissions
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    
    if (!rolesResponse.ok) {
      console.error(`[checkUserAdminInGuild] Failed to get roles: ${rolesResponse.status}`);
      return false;
    }
    
    const roles = await rolesResponse.json();
    const memberRoleIds = member.roles || [];
    
    // Calculate combined permissions from all roles
    let permissions = BigInt(0);
    for (const role of roles) {
      if (memberRoleIds.includes(role.id) || role.id === guildId) { // @everyone role has same ID as guild
        permissions |= BigInt(role.permissions);
      }
    }
    
    // Check for ADMINISTRATOR (0x8)
    const ADMINISTRATOR = BigInt(0x8);
    const hasAdmin = (permissions & ADMINISTRATOR) === ADMINISTRATOR;
    console.log(`[checkUserAdminInGuild] Calculated permissions: ${permissions.toString()}, hasAdmin: ${hasAdmin}`);
    
    return hasAdmin;
  } catch (error) {
    console.error(`[checkUserAdminInGuild] Error:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Endpoint to refresh token and get guilds (called from frontend when token expires)
    if (path === "refresh" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get stored refresh token
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("discord_refresh_token, discord_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.discord_refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token", needsRelink: true }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh the token
      const newTokens = await refreshDiscordToken(profile.discord_refresh_token);
      if (!newTokens) {
        return new Response(JSON.stringify({ error: "Token refresh failed", needsRelink: true }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      // Update stored tokens
      await supabaseAdmin
        .from("profiles")
        .update({
          discord_access_token: newTokens.access_token,
          discord_refresh_token: newTokens.refresh_token,
          discord_token_expires_at: expiresAt,
        })
        .eq("user_id", user.id);

      // Get user's guilds with new token
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${newTokens.access_token}` },
      });

      if (!guildsResponse.ok) {
        return new Response(JSON.stringify({ error: "Failed to get guilds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const guilds = await guildsResponse.json();

      return new Response(JSON.stringify({
        access_token: newTokens.access_token,
        guilds: guilds.map((g: any) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          owner: g.owner,
          permissions: g.permissions,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Exchange code for tokens (called from frontend)
    if (path === "exchange" && req.method === "POST") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET!,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        return new Response(JSON.stringify({ error: `Failed to exchange code: ${errorText}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      const expiresIn = tokens.expires_in; // seconds until expiry

      // Get Discord user info
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        return new Response(JSON.stringify({ error: "Failed to get Discord user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const discordUser = await userResponse.json();

      // Get user's guilds
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!guildsResponse.ok) {
        return new Response(JSON.stringify({ error: "Failed to get Discord guilds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const guilds = await guildsResponse.json();

      // Return Discord data (including access token for future permission checks)
      // Also return refresh token info so frontend knows when to refresh
      return new Response(JSON.stringify({
        user: {
          id: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar,
        },
        guilds: guilds.map((g: any) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          owner: g.owner,
          permissions: g.permissions,
        })),
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // API endpoint to get user's manageable servers
    if (path === "servers" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      // Get current user
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user's Discord ID from profile
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("discord_id")
        .eq("id", user.id)
        .single();

      if (!profile?.discord_id) {
        return new Response(JSON.stringify({ error: "Discord not linked", needsLink: true }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get body with user's guilds
      const body = await req.json();
      const userGuilds = body.guilds || [];

      // Filter guilds where user has admin permission (0x8 = ADMINISTRATOR)
      const adminGuilds = userGuilds.filter((g: any) => {
        const permissions = BigInt(g.permissions || 0);
        return g.owner || (permissions & BigInt(0x8)) === BigInt(0x8);
      });

      // Get bot's servers from database
      const { data: botServers } = await supabaseClient
        .from("discord_servers")
        .select("*");

      // Match user's admin guilds with bot's servers
      const matchedServers = adminGuilds
        .filter((g: any) => botServers?.some((bs: any) => bs.guild_id === g.id))
        .map((g: any) => {
          const botServer = botServers?.find((bs: any) => bs.guild_id === g.id);
          return {
            ...botServer,
            guild_name: g.name,
            guild_icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
          };
        });

      return new Response(JSON.stringify({ servers: matchedServers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NEW: Bot-based permission check (Dyno approach) - no user OAuth needed after initial link
    // This uses the BOT token to check if user has admin in servers the bot is in
    if (path === "bot-servers" && req.method === "POST") {
      console.log("[bot-servers] Endpoint called");
      
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        console.log("[bot-servers] No auth header");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      // Get current user
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        console.log("[bot-servers] User auth failed:", userError?.message);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("[bot-servers] User authenticated:", user.id);

      // Get user's Discord ID from profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("discord_id, discord_username")
        .eq("user_id", user.id)
        .single();

      console.log("[bot-servers] Profile lookup:", profile ? `discord_id=${profile.discord_id}` : "not found", profileError?.message || "");

      if (!profile?.discord_id) {
        return new Response(JSON.stringify({ error: "Discord not linked", needsLink: true }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all servers the bot is in from database
      const { data: botServers, error: serversError } = await supabaseAdmin
        .from("discord_servers")
        .select("*");

      console.log("[bot-servers] Bot servers from DB:", botServers?.length || 0, serversError?.message || "");
      
      if (botServers && botServers.length > 0) {
        console.log("[bot-servers] Server guild_ids:", botServers.map((s: any) => s.guild_id).join(", "));
      }

      if (!botServers || botServers.length === 0) {
        return new Response(JSON.stringify({ servers: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check each server using BOT token to see if user has admin
      const adminServers = [];
      console.log("[bot-servers] Checking admin status for user", profile.discord_id, "in", botServers.length, "servers");
      
      for (const server of botServers) {
        console.log(`[bot-servers] Checking server: ${server.guild_name} (${server.guild_id})`);
        const isAdmin = await checkUserAdminInGuild(server.guild_id, profile.discord_id);
        console.log(`[bot-servers] isAdmin result for ${server.guild_name}: ${isAdmin}`);
        
        if (isAdmin) {
          adminServers.push({
            ...server,
            discord_username: profile.discord_username,
          });
          
          // Auto-claim server for this user if not already claimed
          if (!server.user_id) {
            await supabaseAdmin
              .from("discord_servers")
              .update({ user_id: user.id, is_configured: true })
              .eq("id", server.id);
          }
        }
      }

      console.log("[bot-servers] Final admin servers count:", adminServers.length);

      return new Response(JSON.stringify({ 
        servers: adminServers,
        discord_id: profile.discord_id,
        discord_username: profile.discord_username,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  } catch (error) {
    console.error("Discord OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
