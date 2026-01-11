/**
 * Whitelist Routes
 * Handles whitelist management for products
 */

import { Router } from 'express';
import db from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/whitelist/systems
 * Get user's whitelist systems
 */
router.get('/systems', requireAuth, async (req, res) => {
  try {
    const systems = await db.queryAll(
      `SELECT ws.*, COUNT(wu.id) as user_count
       FROM whitelist_systems ws
       LEFT JOIN whitelist_users wu ON ws.id = wu.whitelist_id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.created_at DESC`,
      [req.user.id]
    );
    
    res.json({ systems });
    
  } catch (error) {
    console.error('Whitelist systems error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/whitelist/systems
 * Create a new whitelist system
 */
router.post('/systems', requireAuth, async (req, res) => {
  try {
    const { name, product_id, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name is required',
        requestId: req.requestId
      });
    }
    
    const system = await db.queryOne(
      `INSERT INTO whitelist_systems (user_id, name, product_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, name, product_id, description]
    );
    
    res.status(201).json({ system });
    
  } catch (error) {
    console.error('Create whitelist system error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/whitelist/systems/:id/users
 * Get users in a whitelist system
 */
router.get('/systems/:id/users', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const system = await db.queryOne(
      'SELECT user_id FROM whitelist_systems WHERE id = $1',
      [req.params.id]
    );
    
    if (!system || system.user_id !== req.user.id) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Whitelist system not found',
        requestId: req.requestId
      });
    }
    
    const users = await db.queryAll(
      `SELECT * FROM whitelist_users
       WHERE whitelist_id = $1
       ORDER BY added_at DESC`,
      [req.params.id]
    );
    
    res.json({ users });
    
  } catch (error) {
    console.error('Whitelist users error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/whitelist/systems/:id/users
 * Add a user to whitelist
 */
router.post('/systems/:id/users', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const system = await db.queryOne(
      'SELECT user_id FROM whitelist_systems WHERE id = $1',
      [req.params.id]
    );
    
    if (!system || system.user_id !== req.user.id) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Whitelist system not found',
        requestId: req.requestId
      });
    }
    
    const { username, discord_id, roblox_id, license_key, expires_at, metadata } = req.body;
    
    if (!username || !license_key) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Username and license_key are required',
        requestId: req.requestId
      });
    }
    
    const user = await db.queryOne(
      `INSERT INTO whitelist_users (whitelist_id, username, discord_id, roblox_id, license_key, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, username, discord_id, roblox_id, license_key, expires_at, metadata || {}]
    );
    
    res.status(201).json({ user });
    
  } catch (error) {
    console.error('Add whitelist user error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /api/whitelist/users/:id
 * Remove a user from whitelist
 */
router.delete('/users/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership through join
    const user = await db.queryOne(
      `SELECT wu.*, ws.user_id as owner_id
       FROM whitelist_users wu
       JOIN whitelist_systems ws ON wu.whitelist_id = ws.id
       WHERE wu.id = $1`,
      [req.params.id]
    );
    
    if (!user || user.owner_id !== req.user.id) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Whitelist user not found',
        requestId: req.requestId
      });
    }
    
    await db.query('DELETE FROM whitelist_users WHERE id = $1', [req.params.id]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete whitelist user error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /api/whitelist/users/:id/ban
 * Ban a whitelist user
 */
router.patch('/users/:id/ban', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Verify ownership
    const user = await db.queryOne(
      `SELECT wu.*, ws.user_id as owner_id
       FROM whitelist_users wu
       JOIN whitelist_systems ws ON wu.whitelist_id = ws.id
       WHERE wu.id = $1`,
      [req.params.id]
    );
    
    if (!user || user.owner_id !== req.user.id) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Whitelist user not found',
        requestId: req.requestId
      });
    }
    
    const updated = await db.queryOne(
      `UPDATE whitelist_users SET
        status = 'banned',
        banned_at = NOW(),
        ban_reason = $1,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, req.params.id]
    );
    
    res.json({ user: updated });
    
  } catch (error) {
    console.error('Ban whitelist user error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/whitelist/verify
 * Verify a license key (public endpoint for bots)
 */
router.get('/verify', async (req, res) => {
  try {
    const { license_key, discord_id, roblox_id } = req.query;
    
    if (!license_key) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'license_key is required',
        requestId: req.requestId
      });
    }
    
    let query = `
      SELECT wu.*, ws.name as system_name, ws.product_id
      FROM whitelist_users wu
      JOIN whitelist_systems ws ON wu.whitelist_id = ws.id
      WHERE wu.license_key = $1 AND wu.status = 'active'
    `;
    const params = [license_key];
    
    if (discord_id) {
      query += ` AND wu.discord_id = $2`;
      params.push(discord_id);
    }
    
    if (roblox_id) {
      query += ` AND wu.roblox_id = $${params.length + 1}`;
      params.push(roblox_id);
    }
    
    const user = await db.queryOne(query, params);
    
    if (!user) {
      return res.json({
        valid: false,
        message: 'License key not found or inactive'
      });
    }
    
    // Check expiry
    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return res.json({
        valid: false,
        message: 'License key has expired'
      });
    }
    
    res.json({
      valid: true,
      user: {
        username: user.username,
        discord_id: user.discord_id,
        roblox_id: user.roblox_id,
        expires_at: user.expires_at,
        system_name: user.system_name,
        product_id: user.product_id
      }
    });
    
  } catch (error) {
    console.error('Verify license error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

export default router;
