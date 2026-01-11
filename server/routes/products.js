/**
 * Products Routes
 * Handles product CRUD operations
 * Supports both PostgreSQL and Supabase backends
 */

import { Router } from 'express';
import db from '../lib/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/products
 * List products with optional filters
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, userId, search, limit = 20, offset = 0 } = req.query;
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      const { data: products, error } = await query;
      
      if (error) throw error;
      
      // Transform to match expected format
      const transformedProducts = products.map(p => ({
        ...p,
        seller_name: p.profiles?.display_name,
        seller_avatar: p.profiles?.avatar_url,
        profiles: undefined
      }));
      
      return res.json({ products: transformedProducts });
    }
    
    // PostgreSQL path
    let query = `
      SELECT p.*, pr.display_name as seller_name, pr.avatar_url as seller_avatar
      FROM products p
      LEFT JOIN profiles pr ON p.user_id = pr.id
      WHERE p.is_published = true
    `;
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (userId) {
      query += ` AND p.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    
    const products = await db.queryAll(query, params);
    
    res.json({ products });
    
  } catch (error) {
    console.error('Products list error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/products/user/me
 * Get current user's products (must be before /:id route)
 */
router.get('/user/me', requireAuth, async (req, res) => {
  try {
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return res.json({ products });
    }
    
    const products = await db.queryAll(
      `SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    res.json({ products });
    
  } catch (error) {
    console.error('My products error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_user_id_fkey (
            display_name,
            avatar_url,
            stripe_connect_status
          )
        `)
        .eq('id', req.params.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'NOT_FOUND',
            message: 'Product not found',
            requestId: req.requestId
          });
        }
        throw error;
      }
      
      const transformedProduct = {
        ...product,
        seller_name: product.profiles?.display_name,
        seller_avatar: product.profiles?.avatar_url,
        stripe_connect_status: product.profiles?.stripe_connect_status,
        profiles: undefined
      };
      
      return res.json({ product: transformedProduct });
    }
    
    const product = await db.queryOne(
      `SELECT p.*, pr.display_name as seller_name, pr.avatar_url as seller_avatar,
              pr.stripe_connect_status
       FROM products p
       LEFT JOIN profiles pr ON p.user_id = pr.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    
    if (!product) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        requestId: req.requestId
      });
    }
    
    res.json({ product });
    
  } catch (error) {
    console.error('Product get error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      currency = 'USD',
      category,
      tags,
      thumbnail_url,
      images,
      file_url,
      file_urls,
      is_free = false
    } = req.body;
    
    if (!title) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Title is required',
        requestId: req.requestId
      });
    }
    
    const productData = {
      user_id: req.user.id,
      title,
      description,
      price: is_free ? 0 : (price || 0),
      currency,
      category,
      tags: tags || [],
      thumbnail_url,
      images: images || [],
      file_url,
      file_urls: file_urls || [],
      is_free,
      is_published: true
    };
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data: product, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      
      return res.status(201).json({ product });
    }
    
    const product = await db.queryOne(
      `INSERT INTO products (
        user_id, title, description, price, currency, category, tags,
        thumbnail_url, images, file_url, file_urls, is_free, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      RETURNING *`,
      [
        req.user.id,
        title,
        description,
        is_free ? 0 : (price || 0),
        currency,
        category,
        tags || [],
        thumbnail_url,
        images || [],
        file_url,
        file_urls || [],
        is_free
      ]
    );
    
    res.status(201).json({ product });
    
  } catch (error) {
    console.error('Product create error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', req.params.id)
        .single();
      
      if (fetchError || !existing) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Product not found',
          requestId: req.requestId
        });
      }
      
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this product',
          requestId: req.requestId
        });
      }
      
      const updateData = {};
      const fields = ['title', 'description', 'price', 'currency', 'category', 'tags',
                      'thumbnail_url', 'images', 'file_url', 'file_urls', 'is_free', 'is_published'];
      
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      updateData.updated_at = new Date().toISOString();
      
      const { data: product, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return res.json({ product });
    }
    
    // PostgreSQL path
    const existing = await db.queryOne(
      'SELECT user_id FROM products WHERE id = $1',
      [req.params.id]
    );
    
    if (!existing) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        requestId: req.requestId
      });
    }
    
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not own this product',
        requestId: req.requestId
      });
    }
    
    const {
      title, description, price, currency, category, tags,
      thumbnail_url, images, file_url, file_urls, is_free, is_published
    } = req.body;
    
    const product = await db.queryOne(
      `UPDATE products SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        currency = COALESCE($4, currency),
        category = COALESCE($5, category),
        tags = COALESCE($6, tags),
        thumbnail_url = COALESCE($7, thumbnail_url),
        images = COALESCE($8, images),
        file_url = COALESCE($9, file_url),
        file_urls = COALESCE($10, file_urls),
        is_free = COALESCE($11, is_free),
        is_published = COALESCE($12, is_published),
        updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [title, description, price, currency, category, tags,
       thumbnail_url, images, file_url, file_urls, is_free, is_published,
       req.params.id]
    );
    
    res.json({ product });
    
  } catch (error) {
    console.error('Product update error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', req.params.id)
        .single();
      
      if (fetchError || !existing) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Product not found',
          requestId: req.requestId
        });
      }
      
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this product',
          requestId: req.requestId
        });
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', req.params.id);
      
      if (error) throw error;
      
      return res.json({ success: true });
    }
    
    // PostgreSQL path
    const existing = await db.queryOne(
      'SELECT user_id FROM products WHERE id = $1',
      [req.params.id]
    );
    
    if (!existing) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        requestId: req.requestId
      });
    }
    
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not own this product',
        requestId: req.requestId
      });
    }
    
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Product delete error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

export default router;
