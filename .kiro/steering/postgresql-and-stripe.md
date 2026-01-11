# PostgreSQL and Stripe Integration Guide

## Local PostgreSQL Database

### Connection Configuration
```javascript
// Environment variables
DB_HOST=localhost          // or VPS IP in production
DB_PORT=5432
DB_NAME=vectabase
DB_USER=vectabase_admin
DB_PASSWORD=your_secure_password
DB_ENCRYPTION_KEY=your_64_char_encryption_key
```

### Running Locally
```bash
# Start PostgreSQL (if using Docker)
docker run -d --name vectabase-db \
  -e POSTGRES_DB=vectabase \
  -e POSTGRES_USER=vectabase_admin \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16

# Or use local PostgreSQL installation
psql -U postgres -c "CREATE DATABASE vectabase;"
psql -U postgres -c "CREATE USER vectabase_admin WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vectabase TO vectabase_admin;"
```

### Running Migrations
```bash
# Apply all migrations
node scripts/apply-migrations.js

# Or manually
psql -U vectabase_admin -d vectabase -f database/schema.sql
```

### Deploying to VPS
1. Push code to GitHub
2. SSH into VPS and pull latest
3. Update `.env` with production database credentials
4. Run migrations
5. Restart services with PM2

```bash
# On VPS
cd /path/to/project
git pull origin main
npm install
node scripts/apply-migrations.js
pm2 restart all
```

## API Server

### Starting the Server
```bash
# Development
npm run dev:server

# Production
npm run start:server
# Or with PM2
pm2 start server/index.js --name vectabase-api
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/refresh` | POST | Refresh JWT token |
| `/api/auth/discord` | GET | Discord OAuth callback |
| `/api/stripe/onboard` | POST | Stripe Connect onboarding |
| `/api/stripe/status` | GET | Check Stripe account status |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Stripe webhook handler |
| `/api/products` | CRUD | Product management |
| `/api/sales` | GET | Sales data |
| `/api/whitelist` | CRUD | Whitelist management |
| `/api/developer/keys` | CRUD | API key management |

## Stripe Integration

### Environment Variables Required
- `STRIPE_SECRET_KEY` - Stripe secret key (test or live)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

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

### Webhook Setup
```bash
# For local development, use Stripe CLI
stripe listen --forward-to localhost:3001/api/stripe/webhook

# For production, set webhook URL in Stripe Dashboard:
# https://your-domain.com/api/stripe/webhook
```

## Database Tables

### Core Tables
- `users` - User accounts (replaces Supabase auth.users)
- `sessions` - Active user sessions
- `profiles` - User profile data
- `products` - Marketplace products
- `sales` - Sales records
- `stores` - Creator stores

### Bot Tables
- `discord_servers` - Discord server configurations
- `bot_products` - Products per server
- `bot_whitelisted_users` - Whitelisted users per product
- `bot_command_permissions` - Command permissions

### Developer API Tables
- `developer_api_keys` - API keys for developers
- `developer_subscriptions` - Subscription tiers
- `obfuscation_credits` - Pay-per-use credits
- `developer_products` - Products linked to Roblox groups
- `whitelist_entries` - Whitelisted users per product

### System Tables
- `secrets` - Encrypted key-value store for API keys/tokens
- `audit_logs` - Security audit trail

## Common Commands

```bash
# Start all services locally
npm run dev

# Run database migrations
node scripts/apply-migrations.js

# Migrate data from Supabase (one-time)
node scripts/migrate-from-supabase.js

# Create database backup
node scripts/backup-database.js

# Run tests
npm test

# Run property tests
npm run test:property
```

## Encryption

All sensitive data is encrypted at rest using AES-256-GCM:
- API keys
- Stripe account IDs
- Discord tokens
- Roblox API keys
- License keys

Master encryption key is stored in `DB_ENCRYPTION_KEY` environment variable.

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection
psql -U vectabase_admin -d vectabase -c "SELECT 1;"
```

### API Server Issues
```bash
# Check logs
pm2 logs vectabase-api

# Check if port is in use
netstat -an | grep 3001
```

### Stripe Webhook Issues
- Verify webhook secret matches
- Check webhook endpoint is accessible
- Review Stripe Dashboard webhook logs
