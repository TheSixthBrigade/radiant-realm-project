# Database Schema Reference

## Database: Local PostgreSQL 16+

**Connection**: Configure via environment variables in `.env`
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vectabase
DB_USER=vectabase_admin
DB_PASSWORD=your_secure_password
```

## Users Table (replaces Supabase auth.users)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | text | Unique email address |
| `password_hash` | text | bcrypt hashed password |
| `email_verified` | boolean | Email verification status |
| `discord_id` | text | Linked Discord user ID |
| `discord_username` | text | Discord username |
| `created_at` | timestamptz | Account creation time |
| `updated_at` | timestamptz | Last update time |
| `last_login_at` | timestamptz | Last login time |

## Profiles Table - Stripe Columns

**CRITICAL: Use the correct column names for Stripe Connect:**

| Column | Type | Description |
|--------|------|-------------|
| `stripe_connect_account_id` | text | Stripe Connect account ID (encrypted) |
| `stripe_connect_status` | text | Onboarding status |

### Stripe Connect Status Values
- `'complete'` - Fully onboarded, can accept payments
- `'connected'` - Alternative complete status (treat same as complete)
- `'pending'` - Onboarding started but not finished
- `'incomplete'` - Details not submitted
- `'not_connected'` - No Stripe account linked
- `null` - Never started onboarding

### Checking if Seller Can Accept Payments
```typescript
// CORRECT way to check Stripe status
const canAcceptPayments = 
  profile.stripe_connect_status === 'complete' || 
  profile.stripe_connect_status === 'connected';
```

## Sessions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users.id |
| `refresh_token_hash` | text | Hashed refresh token |
| `expires_at` | timestamptz | Session expiry |
| `ip_address` | inet | Client IP |
| `user_agent` | text | Client user agent |

## Sales Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK to products.id |
| `buyer_id` | uuid | FK to users.id (nullable) |
| `seller_id` | uuid | FK to users.id |
| `amount` | decimal | Sale amount |
| `currency` | text | Currency code (default: USD) |
| `stripe_payment_id` | text | Stripe payment intent ID |
| `created_at` | timestamptz | When sale occurred |

## Bot Tables

### discord_servers
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `guild_id` | text | Discord guild ID (unique) |
| `guild_name` | text | Server name |
| `owner_id` | text | Discord owner ID |
| `user_id` | uuid | FK to users.id |
| `is_configured` | boolean | Setup complete |

### bot_products
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `server_id` | uuid | FK to discord_servers.id |
| `name` | text | Product name in bot |
| `roblox_group_id` | text | Roblox group ID |
| `role_id` | text | Discord role ID to assign |
| `payhip_api_key` | text | Payhip API key (encrypted) |
| `roblox_api_key_encrypted` | bytea | Encrypted Roblox API key |

### bot_whitelisted_users
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK to bot_products.id |
| `discord_id` | text | Discord user ID |
| `discord_username` | text | Discord username |
| `roblox_id` | text | Roblox user ID |
| `roblox_username` | text | Roblox username |
| `license_key` | text | Redeemed license key |
| `redeemed_at` | timestamptz | When redeemed |

## Secrets Table (encrypted key-value store)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `key_name` | text | Secret identifier (unique) |
| `encrypted_value` | bytea | AES-256-GCM encrypted value |
| `accessed_at` | timestamptz | Last access time |

## Audit Logs Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users.id |
| `action` | text | Action performed |
| `resource_type` | text | Type of resource |
| `resource_id` | text | Resource identifier |
| `details` | jsonb | Additional details |
| `ip_address` | inet | Client IP |
| `created_at` | timestamptz | When action occurred |

## Encryption

All sensitive columns are encrypted using AES-256-GCM:
- `stripe_connect_account_id`
- `payhip_api_key`
- `roblox_api_key_encrypted`
- All values in `secrets` table

Master key stored in `DB_ENCRYPTION_KEY` environment variable.
