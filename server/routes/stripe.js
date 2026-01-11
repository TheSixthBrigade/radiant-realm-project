/**
 * Stripe Routes
 * Handles Stripe Connect onboarding, checkout, and webhooks
 * Supports both PostgreSQL and Supabase backends
 */

import { Router } from 'express';
import Stripe from 'stripe';
import express from 'express';
import db from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Initialize Stripe (only if key is provided)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  Stripe not configured - payment features disabled');
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * POST /api/stripe/onboard
 * Create Stripe Connect account and onboarding link
 */
router.post('/onboard', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      requestId: req.requestId
    });
  }
  
  try {
    const userId = req.user.id;
    let profile, accountId;
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id, stripe_connect_status')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      profile = data;
      accountId = profile?.stripe_connect_account_id;
      
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: { user_id: userId }
        });
        
        accountId = account.id;
        
        await supabase
          .from('profiles')
          .update({
            stripe_connect_account_id: accountId,
            stripe_connect_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    } else {
      profile = await db.queryOne(
        'SELECT stripe_connect_account_id, stripe_connect_status FROM profiles WHERE id = $1',
        [userId]
      );
      
      accountId = profile?.stripe_connect_account_id;
      
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: { user_id: userId }
        });
        
        accountId = account.id;
        
        await db.query(
          `UPDATE profiles SET 
            stripe_connect_account_id = $1,
            stripe_connect_status = 'pending',
            updated_at = NOW()
           WHERE id = $2`,
          [accountId, userId]
        );
      }
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${FRONTEND_URL}/onboarding?stripe_refresh=true`,
      return_url: `${FRONTEND_URL}/onboarding?stripe_return=true`,
      type: 'account_onboarding'
    });
    
    res.json({
      url: accountLink.url,
      accountId
    });
    
  } catch (error) {
    console.error('Stripe onboard error:', error.message);
    res.status(500).json({
      error: 'STRIPE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/stripe/status
 * Check Stripe Connect account status
 */
router.get('/status', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe is not configured',
      requestId: req.requestId
    });
  }
  
  try {
    const userId = req.user.id;
    let profile;
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id, stripe_connect_status')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      profile = data;
    } else {
      profile = await db.queryOne(
        'SELECT stripe_connect_account_id, stripe_connect_status FROM profiles WHERE id = $1',
        [userId]
      );
    }
    
    if (!profile?.stripe_connect_account_id) {
      return res.json({
        connected: false,
        status: 'not_connected'
      });
    }
    
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    
    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'complete';
    } else if (account.details_submitted) {
      status = 'pending';
    } else {
      status = 'incomplete';
    }
    
    if (status !== profile.stripe_connect_status) {
      if (db.isUsingSupabase()) {
        const supabase = db.getSupabaseClient();
        await supabase
          .from('profiles')
          .update({ stripe_connect_status: status, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else {
        await db.query(
          'UPDATE profiles SET stripe_connect_status = $1, updated_at = NOW() WHERE id = $2',
          [status, userId]
        );
      }
    }
    
    res.json({
      connected: status === 'complete',
      status,
      accountId: profile.stripe_connect_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });
    
  } catch (error) {
    console.error('Stripe status error:', error.message);
    res.status(500).json({
      error: 'STRIPE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/stripe/checkout
 * Create a checkout session for product purchase
 */
router.post('/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe is not configured',
      requestId: req.requestId
    });
  }
  
  try {
    const { productId, buyerId, affiliateRef } = req.body;
    let product;
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_user_id_fkey (
            id,
            stripe_connect_account_id,
            stripe_connect_status
          )
        `)
        .eq('id', productId)
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
      
      product = {
        ...data,
        seller_id: data.user_id,
        stripe_connect_account_id: data.profiles?.stripe_connect_account_id,
        stripe_connect_status: data.profiles?.stripe_connect_status
      };
    } else {
      product = await db.queryOne(
        `SELECT p.*, pr.stripe_connect_account_id, pr.stripe_connect_status, pr.id as seller_id
         FROM products p
         JOIN profiles pr ON p.user_id = pr.id
         WHERE p.id = $1`,
        [productId]
      );
      
      if (!product) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Product not found',
          requestId: req.requestId
        });
      }
    }
    
    if (product.stripe_connect_status !== 'complete' && product.stripe_connect_status !== 'connected') {
      return res.status(400).json({
        error: 'SELLER_NOT_CONNECTED',
        message: 'Seller has not connected Stripe',
        requestId: req.requestId
      });
    }
    
    const platformFeePercent = 0.10;
    const amountInCents = Math.round(product.price * 100);
    const platformFee = Math.round(amountInCents * platformFeePercent);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: product.currency?.toLowerCase() || 'usd',
          product_data: {
            name: product.title,
            description: product.description?.substring(0, 500),
            images: product.thumbnail_url ? [product.thumbnail_url] : []
          },
          unit_amount: amountInCents
        },
        quantity: 1
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: product.stripe_connect_account_id
        }
      },
      metadata: {
        product_id: productId,
        seller_id: product.seller_id,
        buyer_id: buyerId || null,
        affiliate_ref: affiliateRef || ''
      },
      success_url: `${FRONTEND_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/product/${productId}`
    });
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
    
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    res.status(500).json({
      error: 'STRIPE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        const saleData = {
          product_id: session.metadata.product_id,
          buyer_id: session.metadata.buyer_id || null,
          seller_id: session.metadata.seller_id,
          amount: session.amount_total / 100,
          currency: session.currency,
          platform_fee: (session.amount_total * 0.10) / 100,
          seller_amount: (session.amount_total * 0.90) / 100,
          stripe_payment_id: session.payment_intent
        };
        
        let saleId = null;
        
        if (db.isUsingSupabase()) {
          const supabase = db.getSupabaseClient();
          
          const { data: saleResult } = await supabase
            .from('sales')
            .insert(saleData)
            .select('id')
            .single();
          
          saleId = saleResult?.id;
          
          await supabase.rpc('increment_downloads', { product_id: session.metadata.product_id });
        } else {
          const result = await db.queryOne(
            `INSERT INTO sales (product_id, buyer_id, seller_id, amount, currency, platform_fee, seller_amount, stripe_payment_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [saleData.product_id, saleData.buyer_id, saleData.seller_id, saleData.amount, 
             saleData.currency, saleData.platform_fee, saleData.seller_amount, saleData.stripe_payment_id]
          );
          
          saleId = result?.id;
          
          await db.query(
            'UPDATE products SET downloads = downloads + 1 WHERE id = $1',
            [session.metadata.product_id]
          );
        }
        
        console.log('Sale recorded:', session.metadata.product_id, 'saleId:', saleId);
        
        // Handle affiliate referral tracking
        const refCode = session.metadata.affiliate_ref;
        console.log('Checking affiliate ref:', refCode);
        
        if (refCode && refCode !== '' && refCode !== 'null') {
          try {
            let affiliateLink = null;
            
            if (db.isUsingSupabase()) {
              const supabase = db.getSupabaseClient();
              
              const { data: linkData } = await supabase
                .from('affiliate_links')
                .select('id, creator_id, conversions, earnings')
                .eq('code', refCode)
                .single();
              
              affiliateLink = linkData;
            } else {
              affiliateLink = await db.queryOne(
                'SELECT id, creator_id, conversions, earnings FROM affiliate_links WHERE code = $1',
                [refCode]
              );
            }
            
            if (affiliateLink) {
              // Get commission rate from affiliate settings
              let commissionRate = 0.10; // Default 10%
              
              if (db.isUsingSupabase()) {
                const supabase = db.getSupabaseClient();
                const { data: settings } = await supabase
                  .from('affiliate_settings')
                  .select('commission_rate')
                  .eq('creator_id', affiliateLink.creator_id)
                  .single();
                
                if (settings?.commission_rate) {
                  commissionRate = settings.commission_rate;
                }
              } else {
                const settings = await db.queryOne(
                  'SELECT commission_rate FROM affiliate_settings WHERE creator_id = $1',
                  [affiliateLink.creator_id]
                );
                
                if (settings?.commission_rate) {
                  commissionRate = parseFloat(settings.commission_rate);
                }
              }
              
              const commissionAmount = saleData.amount * commissionRate;
              console.log('Commission calculation - rate:', commissionRate, 'amount:', saleData.amount, 'commission:', commissionAmount);
              
              // Create referral record if we have a saleId
              if (saleId) {
                if (db.isUsingSupabase()) {
                  const supabase = db.getSupabaseClient();
                  await supabase
                    .from('affiliate_referrals')
                    .insert({
                      link_id: affiliateLink.id,
                      sale_id: saleId,
                      commission_amount: commissionAmount,
                      status: 'pending'
                    });
                } else {
                  await db.query(
                    `INSERT INTO affiliate_referrals (link_id, sale_id, commission_amount, status)
                     VALUES ($1, $2, $3, 'pending')`,
                    [affiliateLink.id, saleId, commissionAmount]
                  );
                }
                console.log('Referral record created');
              }
              
              // Update affiliate link stats
              const newConversions = (affiliateLink.conversions || 0) + 1;
              const newEarnings = parseFloat(affiliateLink.earnings || 0) + commissionAmount;
              
              if (db.isUsingSupabase()) {
                const supabase = db.getSupabaseClient();
                await supabase
                  .from('affiliate_links')
                  .update({
                    conversions: newConversions,
                    earnings: newEarnings
                  })
                  .eq('id', affiliateLink.id);
              } else {
                await db.query(
                  'UPDATE affiliate_links SET conversions = $1, earnings = $2 WHERE id = $3',
                  [newConversions, newEarnings, affiliateLink.id]
                );
              }
              
              console.log('Affiliate link updated - conversions:', newConversions, 'earnings:', newEarnings);
            } else {
              console.log('No affiliate link found for code:', refCode);
            }
          } catch (affErr) {
            console.error('Failed to track affiliate referral:', affErr);
          }
        }
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        if (db.isUsingSupabase()) {
          const supabase = db.getSupabaseClient();
          await supabase
            .from('developer_subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', subscription.customer);
        } else {
          await db.query(
            `UPDATE developer_subscriptions SET
              stripe_subscription_id = $1,
              stripe_customer_id = $2,
              current_period_start = to_timestamp($3),
              current_period_end = to_timestamp($4),
              updated_at = NOW()
             WHERE stripe_customer_id = $2`,
            [subscription.id, subscription.customer, subscription.current_period_start, subscription.current_period_end]
          );
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        if (db.isUsingSupabase()) {
          const supabase = db.getSupabaseClient();
          await supabase
            .from('developer_subscriptions')
            .update({
              tier: 'free',
              stripe_subscription_id: null,
              current_period_start: null,
              current_period_end: null,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', subscription.customer);
        } else {
          await db.query(
            `UPDATE developer_subscriptions SET
              tier = 'free',
              stripe_subscription_id = NULL,
              current_period_start = NULL,
              current_period_end = NULL,
              updated_at = NOW()
             WHERE stripe_customer_id = $1`,
            [subscription.customer]
          );
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn('Payment failed for customer:', invoice.customer);
        break;
      }
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * GET /api/stripe/dashboard
 * Get Stripe Express dashboard link
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe is not configured',
      requestId: req.requestId
    });
  }
  
  try {
    let profile;
    
    if (db.isUsingSupabase()) {
      const supabase = db.getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id')
        .eq('id', req.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      profile = data;
    } else {
      profile = await db.queryOne(
        'SELECT stripe_connect_account_id FROM profiles WHERE id = $1',
        [req.user.id]
      );
    }
    
    if (!profile?.stripe_connect_account_id) {
      return res.status(400).json({
        error: 'NOT_CONNECTED',
        message: 'Stripe account not connected',
        requestId: req.requestId
      });
    }
    
    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
    
    res.json({ url: loginLink.url });
    
  } catch (error) {
    console.error('Stripe dashboard error:', error.message);
    res.status(500).json({
      error: 'STRIPE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

export default router;
