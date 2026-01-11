/**
 * Authentication Routes
 * Handles user registration, login, and token management
 */

import { Router } from 'express';
import auth from '../services/auth.js';
import discordOAuth from '../services/discord-oauth.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Store OAuth states temporarily (use Redis in production)
const oauthStates = new Map();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await auth.register(email, password);
    
    res.status(201).json({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: auth.getTokenExpiry()
    });
    
  } catch (error) {
    res.status(400).json({
      error: 'REGISTRATION_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await auth.login(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: auth.getTokenExpiry()
    });
    
  } catch (error) {
    res.status(401).json({
      error: 'LOGIN_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Refresh token is required',
        requestId: req.requestId
      });
    }
    
    const result = await auth.refreshAccessToken(refreshToken);
    
    res.json({
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: auth.getTokenExpiry()
    });
    
  } catch (error) {
    res.status(401).json({
      error: 'REFRESH_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await auth.logout(refreshToken);
    
    res.json({ success: true });
    
  } catch (error) {
    // Still return success even if logout fails
    res.json({ success: true });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    await auth.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    res.status(400).json({
      error: 'PASSWORD_CHANGE_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/auth/discord
 * Initiate Discord OAuth flow
 */
router.get('/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state with expiry
  oauthStates.set(state, {
    createdAt: Date.now(),
    redirectTo: req.query.redirect || '/'
  });
  
  // Clean up old states
  for (const [key, value] of oauthStates.entries()) {
    if (Date.now() - value.createdAt > 600000) { // 10 minutes
      oauthStates.delete(key);
    }
  }
  
  const authUrl = discordOAuth.getAuthorizationUrl(state);
  res.redirect(authUrl);
});

/**
 * GET /api/auth/discord/callback
 * Handle Discord OAuth callback
 */
router.get('/discord/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }
    
    // Verify state
    const storedState = oauthStates.get(state);
    if (!storedState) {
      return res.redirect('/?error=invalid_state');
    }
    oauthStates.delete(state);
    
    // Handle callback
    const result = await discordOAuth.handleCallback(code, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Redirect with tokens (in production, use secure cookies or redirect to frontend)
    const redirectUrl = new URL(storedState.redirectTo, process.env.FRONTEND_URL || 'http://localhost:5173');
    redirectUrl.searchParams.set('token', result.token);
    redirectUrl.searchParams.set('refreshToken', result.refreshToken);
    if (result.isNewUser) {
      redirectUrl.searchParams.set('newUser', 'true');
    }
    
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('Discord OAuth error:', error.message);
    res.redirect(`/?error=${encodeURIComponent('Discord authentication failed')}`);
  }
});

/**
 * POST /api/auth/discord/unlink
 * Unlink Discord from account
 */
router.post('/discord/unlink', requireAuth, async (req, res) => {
  try {
    await discordOAuth.unlinkDiscord(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      error: 'UNLINK_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

export default router;
