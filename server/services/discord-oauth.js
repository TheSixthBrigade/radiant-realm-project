/**
 * Discord OAuth Service
 * Handles Discord OAuth2 authentication flow
 */

import db from '../lib/db.js';
import { generateAccessToken, createSession } from './auth.js';

// Discord OAuth configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/discord/callback';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2';

/**
 * Generate Discord OAuth authorization URL
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Authorization URL
 */
export function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email guilds',
    state
  });
  
  return `${DISCORD_OAUTH_URL}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Token response
 */
async function exchangeCode(code) {
  const response = await fetch(`${DISCORD_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code');
  }
  
  return response.json();
}

/**
 * Get Discord user info
 * @param {string} accessToken - Discord access token
 * @returns {Promise<Object>} User info
 */
async function getDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Discord user info');
  }
  
  return response.json();
}

/**
 * Handle Discord OAuth callback
 * @param {string} code - Authorization code
 * @param {Object} metadata - Request metadata
 * @returns {Promise<{user: Object, token: string, refreshToken: string, isNewUser: boolean}>}
 */
export async function handleCallback(code, metadata = {}) {
  // Exchange code for tokens
  const tokens = await exchangeCode(code);
  
  // Get Discord user info
  const discordUser = await getDiscordUser(tokens.access_token);
  
  // Check if user exists with this Discord ID
  let user = await db.queryOne(
    'SELECT * FROM users WHERE discord_id = $1',
    [discordUser.id]
  );
  
  let isNewUser = false;
  
  if (!user) {
    // Check if user exists with this email
    if (discordUser.email) {
      user = await db.queryOne(
        'SELECT * FROM users WHERE email = $1',
        [discordUser.email.toLowerCase()]
      );
      
      if (user) {
        // Link Discord to existing account
        await db.query(
          `UPDATE users SET 
            discord_id = $1,
            discord_username = $2,
            discord_avatar = $3,
            discord_refresh_token = $4,
            updated_at = NOW()
           WHERE id = $5`,
          [
            discordUser.id,
            discordUser.username,
            discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            tokens.refresh_token,
            user.id
          ]
        );
      }
    }
    
    if (!user) {
      // Create new user
      isNewUser = true;
      
      user = await db.queryOne(
        `INSERT INTO users (
          email,
          password_hash,
          email_verified,
          discord_id,
          discord_username,
          discord_avatar,
          discord_refresh_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          discordUser.email?.toLowerCase() || `${discordUser.id}@discord.local`,
          '$2b$12$discord_oauth_no_password', // Placeholder - user must set password or use Discord
          discordUser.verified || false,
          discordUser.id,
          discordUser.username,
          discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
          tokens.refresh_token
        ]
      );
    }
  } else {
    // Update existing user's Discord info
    await db.query(
      `UPDATE users SET 
        discord_username = $1,
        discord_avatar = $2,
        discord_refresh_token = $3,
        last_login_at = NOW(),
        updated_at = NOW()
       WHERE id = $4`,
      [
        discordUser.username,
        discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
        tokens.refresh_token,
        user.id
      ]
    );
  }
  
  // Generate tokens
  const token = generateAccessToken(user);
  const refreshToken = await createSession(user.id, metadata);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      discord_id: user.discord_id || discordUser.id,
      discord_username: discordUser.username,
      discord_avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null
    },
    token,
    refreshToken,
    isNewUser
  };
}

/**
 * Refresh Discord access token
 * @param {string} userId - User ID
 * @returns {Promise<string>} New Discord access token
 */
export async function refreshDiscordToken(userId) {
  const user = await db.queryOne(
    'SELECT discord_refresh_token FROM users WHERE id = $1',
    [userId]
  );
  
  if (!user?.discord_refresh_token) {
    throw new Error('No Discord refresh token available');
  }
  
  const response = await fetch(`${DISCORD_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.discord_refresh_token
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh Discord token');
  }
  
  const tokens = await response.json();
  
  // Update refresh token
  await db.query(
    'UPDATE users SET discord_refresh_token = $1, updated_at = NOW() WHERE id = $2',
    [tokens.refresh_token, userId]
  );
  
  return tokens.access_token;
}

/**
 * Unlink Discord from user account
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function unlinkDiscord(userId) {
  await db.query(
    `UPDATE users SET 
      discord_id = NULL,
      discord_username = NULL,
      discord_avatar = NULL,
      discord_refresh_token = NULL,
      updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export default {
  getAuthorizationUrl,
  handleCallback,
  refreshDiscordToken,
  unlinkDiscord
};
