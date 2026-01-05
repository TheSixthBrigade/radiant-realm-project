import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { logBotEvent, logError } from '../../utils/logger.js';
import { requireGuild, isAdmin } from '../middleware/adminCheck.js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const data = new SlashCommandBuilder()
  .setName('link-account')
  .setDescription('Link this Discord server to your Vectabase account')
  .addStringOption(option =>
    option
      .setName('link_code')
      .setDescription('Your Vectabase link code (get it from the Bot Dashboard)')
      .setRequired(true)
  );

export async function execute(interaction) {
  // Check if in guild
  const guildError = requireGuild(interaction);
  if (guildError) {
    return interaction.reply({ content: guildError, ephemeral: true });
  }

  // Only admins can link servers
  if (!isAdmin(interaction)) {
    return interaction.reply({
      content: '❌ You need Administrator permission to link this server.',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const linkCode = interaction.options.getString('link_code');

  if (!supabase) {
    return interaction.editReply({
      content: '❌ Database connection not configured.',
    });
  }

  try {
    // Verify the link code and get the user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, discord_link_code, discord_link_expires')
      .eq('discord_link_code', linkCode)
      .single();

    if (profileError || !profile) {
      return interaction.editReply({
        content: '❌ Invalid link code. Please generate a new one from the Bot Dashboard.',
      });
    }

    // Check if code is expired
    if (profile.discord_link_expires && new Date(profile.discord_link_expires) < new Date()) {
      return interaction.editReply({
        content: '❌ This link code has expired. Please generate a new one from the Bot Dashboard.',
      });
    }

    // Update the server with the user_id
    const { error: updateError } = await supabase
      .from('discord_servers')
      .update({
        user_id: profile.id,
        is_configured: true,
        updated_at: new Date().toISOString()
      })
      .eq('guild_id', interaction.guildId);

    if (updateError) {
      logError(updateError, { context: 'LinkAccount', guild_id: interaction.guildId });
      return interaction.editReply({
        content: '❌ Failed to link server. Please try again.',
      });
    }

    // Clear the link code so it can't be reused
    await supabase
      .from('profiles')
      .update({
        discord_link_code: null,
        discord_link_expires: null
      })
      .eq('id', profile.id);

    logBotEvent('SERVER_LINKED', {
      guild_id: interaction.guildId,
      guild_name: interaction.guild.name,
      user_id: profile.id,
      username: profile.username
    });

    const embed = new EmbedBuilder()
      .setColor(0x22C55E)
      .setTitle('✅ Server Linked!')
      .setDescription(`This server is now linked to **${profile.username}**'s Vectabase account.`)
      .addFields(
        { name: 'Server', value: interaction.guild.name, inline: true },
        { name: 'Account', value: profile.username, inline: true }
      )
      .setFooter({ text: 'You can now manage this server from the Bot Dashboard' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logError(error, { context: 'LinkAccount', guild_id: interaction.guildId });
    return interaction.editReply({
      content: '❌ An error occurred while linking the server.',
    });
  }
}
