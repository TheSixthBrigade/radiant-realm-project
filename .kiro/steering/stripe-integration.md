# Stripe Connect Integration Guide

## Overview
This platform uses Stripe Connect to enable sellers to receive payments. The platform takes a fee and transfers the rest to the seller's connected Stripe account.

## Stripe Connect Flow

1. **Onboarding**: User clicks "Connect Stripe" → redirected to Stripe onboarding
2. **Return**: User returns to `/onboarding?stripe_return=true`
3. **Status Check**: `/api/stripe/status` endpoint verifies account status
4. **Database Update**: `stripe_connect_status` updated to `'complete'` when ready

## API Endpoints (Local Server)

### POST /api/stripe/onboard
Creates a Stripe Connect account link for onboarding.

### GET /api/stripe/status
Checks a user's Stripe account status and updates the database.
- Uses `stripe_connect_account_id` and `stripe_connect_status` columns

### POST /api/stripe/checkout
Creates a checkout session for product purchases.
- Reads seller's `stripe_connect_account_id` from profiles
- Creates payment with `transfer_data` to seller's account

### POST /api/stripe/webhook
Handles Stripe webhook events:
- `checkout.session.completed` → Creates sales record
- `customer.subscription.*` → Updates subscription status

## Creating Sales Records

When a checkout completes, the webhook handler should:
```javascript
// Insert sales record using local PostgreSQL
await db.query(`
  INSERT INTO sales (product_id, buyer_id, seller_id, amount, currency, stripe_payment_id)
  VALUES ($1, $2, $3, $4, $5, $6)
`, [
  metadata.product_id,
  metadata.buyer_id || null,
  metadata.seller_id,
  session.amount_total / 100,
  session.currency,
  session.payment_intent
]);

// Increment product downloads
await db.query(`
  UPDATE products SET downloads = downloads + 1 WHERE id = $1
`, [metadata.product_id]);
```

## Webhook Setup

### Local Development
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### Production (VPS)
Set webhook URL in Stripe Dashboard:
```
https://your-domain.com/api/stripe/webhook
```

## Environment Variables
```
STRIPE_SECRET_KEY=sk_test_xxx or sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Common Issues

### "Seller has not connected Stripe"
- Check `stripe_connect_status` equals `'complete'` or `'connected'`
- Do NOT check `stripe_onboarding_status` (wrong column)

### Sales not showing in dashboard
- Verify webhook endpoint is receiving events
- Check webhook creates sales records on `checkout.session.completed`
- Ensure `product_id` is passed in checkout metadata

### Revenue showing $0
- Sales records must exist in `sales` table
- Dashboard queries `SUM(amount)` from sales table

### Webhook signature verification failing
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook in Stripe Dashboard
- For local dev, use the secret from `stripe listen` output
