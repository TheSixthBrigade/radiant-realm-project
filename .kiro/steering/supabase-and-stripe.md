# Supabase and Stripe Integration Guide

## Supabase Project
- Project ID: `cmmeqzkbiiqqfvzkmkzt`
- Dashboard: https://supabase.com/dashboard/project/cmmeqzkbiiqqfvzkmkzt

## Deploying Edge Functions

### Using Supabase MCP Power (Preferred)
Use the `supabase-hosted` power to deploy functions:
```
kiroPowers action="use" powerName="supabase-hosted" serverName="supabase" toolName="deploy_edge_function"
```

Parameters:
- `project_id`: "cmmeqzkbiiqqfvzkmkzt"
- `name`: function name (e.g., "api-dashboard-checkout")
- `verify_jwt`: false (for public endpoints or custom auth)
- `files`: array of {name, content} objects

### Using npx CLI (Alternative)
```bash
npx supabase functions deploy <function-name> --no-verify-jwt
```

## Running SQL Migrations

### Using Supabase MCP Power (Preferred)
For DDL operations (CREATE TABLE, ALTER, etc.):
```
kiroPowers action="use" powerName="supabase-hosted" serverName="supabase" toolName="apply_migration"
```

For queries (SELECT, INSERT, UPDATE):
```
kiroPowers action="use" powerName="supabase-hosted" serverName="supabase" toolName="execute_sql"
```

## Stripe Integration

### Environment Variables Required
- `STRIPE_SECRET_KEY` - Stripe secret key (test or live)
- `STRIPE_WEBHOOK_SECRET_API` - Webhook signing secret for API webhooks

### Pricing Structure
- Pro: £7/month (700 pence)
- Pro+: £14/month (1400 pence)
- Enterprise: £25/month (2500 pence)
- Credits: $1 USD per credit (100 cents)

### Webhook Events Handled
- `checkout.session.completed` - Credit purchases and subscription checkouts
- `customer.subscription.created/updated` - Subscription tier changes
- `customer.subscription.deleted` - Subscription cancellations
- `invoice.payment_failed` - Failed payments

### Important Notes
- Use `constructEventAsync` (not `constructEvent`) for Deno webhook verification
- Use `price_data` for dynamic pricing instead of pre-created price IDs
- Subscriptions use GBP, credits use USD

## Database Tables

### Developer API Tables
- `developer_api_keys` - API keys for developers
- `developer_subscriptions` - Subscription tiers and Stripe info
- `obfuscation_credits` - Pay-per-use credits
- `obfuscation_usage` - Daily usage tracking
- `developer_products` - Products linked to Roblox groups
- `whitelist_entries` - Whitelisted users per product

## Common Commands

```bash
# Deploy all API functions
npx supabase functions deploy api-dashboard-checkout --no-verify-jwt
npx supabase functions deploy api-stripe-webhook --no-verify-jwt
npx supabase functions deploy api-keys --no-verify-jwt
npx supabase functions deploy api-verify --no-verify-jwt

# Check function logs
npx supabase functions logs api-dashboard-checkout
```
