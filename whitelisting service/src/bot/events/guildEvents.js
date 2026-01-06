import { Events } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { logBotEvent, logError } from '../../utils/logger.js';

// Lazy-initialize Supabase client (env vars loaded after import)
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('[GuildEvents] Supabase URL:', supabaseUrl);
  console.log('[GuildEvents] Supabase Key exists:', !!supabaseKey);
  
  if (supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabase;
}

/**
 * Register guild events on the Discord client
 * @param {Client} client - Discord.js client
 */
export function registerGuildEvents(client) {
  // When bot joins a new server
  client.on(Events.GuildCreate, async (guild) => {
    logBotEvent('GUILD_JOIN', {
      guild_id: guild.id,
      guild_name: guild.name,
      member_count: guild.memberCount,
      owner_id: guild.ownerId
    });

    console.log(`✅ Bot joined server: ${guild.name} (${guild.id})`);

    // Register server in Supabase
    await registerServer(guild);
  });

  // When bot leaves/is kicked from a server
  client.on(Events.GuildDelete, async (guild) => {
    logBotEvent('GUILD_LEAVE', {
      guild_id: guild.id,
      guild_name: guild.name
    });

    console.log(`❌ Bot left server: ${guild.name} (${guild.id})`);

    // Optionally mark server as inactive (don't delete to preserve data)
    await markServerInactive(guild.id);
  });

  // When guild info is updated
  client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name || oldGuild.icon !== newGuild.icon) {
      await updateServerInfo(newGuild);
    }
  });
}

/**
 * Register a server in Supabase when bot joins
 * @param {Guild} guild - Discord guild object
 */
async function registerServer(guild) {
  const sb = getSupabase();
  if (!sb) {
    console.warn('Supabase not configured, skipping server registration');
    return;
  }

  try {
    // Get guild icon URL
    const iconUrl = guild.iconURL({ size: 128, format: 'png' });

    // Check if server owner has a linked Vectabase account
    // Look for a profile with matching discord_id
    let userId = null;
    const { data: ownerProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('discord_id', guild.ownerId)
      .single();
    
    if (ownerProfile) {
      userId = ownerProfile.id;
    }

    // Upsert server (insert or update if exists)
    const { data, error } = await sb
      .from('discord_servers')
      .upsert({
        guild_id: guild.id,
        guild_name: guild.name,
        guild_icon: iconUrl,
        owner_id: guild.ownerId,
        user_id: userId, // Link to Vectabase account if found
        member_count: guild.memberCount,
        is_configured: userId ? true : false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'guild_id'
      })
      .select()
      .single();

    if (error) {
      logError(error, { context: 'RegisterServer', guild_id: guild.id });
      console.error(`Failed to register server ${guild.name}:`, error.message);
    } else {
      console.log(`📝 Server registered in database: ${guild.name}${userId ? ' (linked to account)' : ''}`);
    }
  } catch (error) {
    logError(error, { context: 'RegisterServer', guild_id: guild.id });
  }
}

/**
 * Mark a server as inactive when bot leaves
 * @param {string} guildId - Discord guild ID
 */
async function markServerInactive(guildId) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // We don't delete the server to preserve product configs and whitelist data
    // Just update the member count to 0 to indicate bot is no longer there
    const { error } = await sb
      .from('discord_servers')
      .update({
        member_count: 0,
        is_configured: false,
        updated_at: new Date().toISOString()
      })
      .eq('guild_id', guildId);

    if (error) {
      logError(error, { context: 'MarkServerInactive', guild_id: guildId });
    }
  } catch (error) {
    logError(error, { context: 'MarkServerInactive', guild_id: guildId });
  }
}

/**
 * Update server info when guild is updated
 * @param {Guild} guild - Discord guild object
 */
async function updateServerInfo(guild) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const iconUrl = guild.iconURL({ size: 128, format: 'png' });

    const { error } = await sb
      .from('discord_servers')
      .update({
        guild_name: guild.name,
        guild_icon: iconUrl,
        member_count: guild.memberCount,
        updated_at: new Date().toISOString()
      })
      .eq('guild_id', guild.id);

    if (error) {
      logError(error, { context: 'UpdateServerInfo', guild_id: guild.id });
    }
  } catch (error) {
    logError(error, { context: 'UpdateServerInfo', guild_id: guild.id });
  }
}

/**
 * Sync all current guilds to database (run on bot startup)
 * @param {Client} client - Discord.js client
 */
export async function syncAllGuilds(client) {
  const sb = getSupabase();
  if (!sb) {
    console.warn('Supabase not configured, skipping guild sync');
    return;
  }

  console.log(`🔄 Syncing ${client.guilds.cache.size} servers to database...`);

  for (const [guildId, guild] of client.guilds.cache) {
    await registerServer(guild);
  }

  console.log(`✅ Server sync complete`);
}
