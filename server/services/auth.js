/**
 * Authentication Service
 * Handles user registration, login, JWT tokens, and sessions
 * Supports both PostgreSQL and Supabase backends
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../lib/db.js';
import { hash } from '../lib/encryption.js';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '1h', '7d')
 * @returns {number} Milliseconds
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 3600000; // Default 1 hour
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
}

/**
 * Register a new user
 * Uses Supabase Auth when DATABASE_TYPE=supabase
 */
export async function register(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  if (db.isUsingSupabase()) {
    // Use Supabase Auth
    const supabase = db.getSupabaseClient();
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password
    });
    
    if (error) throw new Error(error.message);
    
    const user = data.user;
    const session = data.session;
    
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      token: session?.access_token || generateAccessToken({ id: user.id, email: user.email }),
      refreshToken: session?.refresh_token || crypto.randomBytes(32).toString('hex')
    };
  }
  
  // PostgreSQL path
  const existing = await db.queryOne(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  
  if (existing) {
    throw new Error('User with this email already exists');
  }
  
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const user = await db.queryOne(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email.toLowerCase(), passwordHash]
  );
  
  const token = generateAccessToken(user);
  const refreshToken = await createSession(user.id);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    },
    token,
    refreshToken
  };
}

/**
 * Login a user
 */
export async function login(email, password, metadata = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (db.isUsingSupabase()) {
    // Use Supabase Auth
    const supabase = db.getSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });
    
    if (error) throw new Error(error.message);
    
    const user = data.user;
    const session = data.session;
    
    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at != null,
        discord_id: profile?.discord_id,
        discord_username: profile?.discord_username
      },
      token: session.access_token,
      refreshToken: session.refresh_token
    };
  }
  
  // PostgreSQL path
  const user = await db.queryOne(
    `SELECT id, email, password_hash, email_verified, discord_id, discord_username
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  const validPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }
  
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );
  
  const token = generateAccessToken(user);
  const refreshToken = await createSession(user.id, metadata);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      discord_id: user.discord_id,
      discord_username: user.discord_username
    },
    token,
    refreshToken
  };
}

/**
 * Generate an access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Create a session with refresh token (PostgreSQL only)
 */
export async function createSession(userId, metadata = {}) {
  if (db.isUsingSupabase()) {
    // Supabase handles sessions internally
    return crypto.randomBytes(32).toString('hex');
  }
  
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = hash(refreshToken);
  const expiresAt = new Date(Date.now() + parseDuration(REFRESH_TOKEN_EXPIRES_IN));
  
  await db.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshTokenHash, expiresAt, metadata.ip || null, metadata.userAgent || null]
  );
  
  return refreshToken;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken) {
  if (db.isUsingSupabase()) {
    const supabase = db.getSupabaseClient();
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) throw new Error(error.message);
    
    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    };
  }
  
  // PostgreSQL path
  const refreshTokenHash = hash(refreshToken);
  
  const session = await db.queryOne(
    `SELECT s.id, s.user_id, u.email
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token_hash = $1 AND s.expires_at > NOW()`,
    [refreshTokenHash]
  );
  
  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }
  
  await db.query('DELETE FROM sessions WHERE id = $1', [session.id]);
  
  const newRefreshToken = await createSession(session.user_id);
  
  const token = generateAccessToken({
    id: session.user_id,
    email: session.email
  });
  
  return { token, refreshToken: newRefreshToken };
}

/**
 * Verify an access token
 */
export async function verifyToken(token) {
  try {
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) return null;
      
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      return {
        id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at != null,
        discord_id: profile?.discord_id,
        discord_username: profile?.discord_username
      };
    }
    
    // PostgreSQL path - verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    const user = await db.queryOne(
      `SELECT id, email, email_verified, discord_id, discord_username
       FROM users WHERE id = $1`,
      [decoded.sub]
    );
    
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Logout - invalidate session
 */
export async function logout(refreshToken) {
  if (!refreshToken) return;
  
  if (db.isUsingSupabase()) {
    const supabase = db.getSupabaseClient();
    await supabase.auth.signOut();
    return;
  }
  
  const refreshTokenHash = hash(refreshToken);
  await db.query(
    'DELETE FROM sessions WHERE refresh_token_hash = $1',
    [refreshTokenHash]
  );
}

/**
 * Logout all sessions for a user
 */
export async function logoutAll(userId) {
  if (db.isUsingSupabase()) {
    // Supabase doesn't support this via client API
    return;
  }
  
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Change password
 */
export async function changePassword(userId, currentPassword, newPassword) {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  
  if (db.isUsingSupabase()) {
    const supabase = db.getSupabaseClient();
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw new Error(error.message);
    return;
  }
  
  // PostgreSQL path
  const user = await db.queryOne(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }
  
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );
  
  await logoutAll(userId);
}

/**
 * Get token expiry time in seconds
 */
export function getTokenExpiry() {
  return parseDuration(JWT_EXPIRES_IN) / 1000;
}

export default {
  register,
  login,
  generateAccessToken,
  createSession,
  refreshAccessToken,
  verifyToken,
  logout,
  logoutAll,
  changePassword,
  getTokenExpiry
};
