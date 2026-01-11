# Design Document: Platform Data Fix

## Overview

This design addresses the data flow issues in the Radiant Realm platform by:
1. Standardizing database column names across all components
2. Fixing the Stripe status display on product pages and settings
3. Ensuring sales records are created for all purchases
4. Fixing dashboard analytics queries
5. Cleaning up orphaned/junk data

## Architecture

The platform uses a React frontend with Supabase backend. Data flows through:

```
User Action → Frontend Component → Supabase Client → Database
                                         ↓
Stripe Webhook → Edge Function → Database → Real-time Subscription → Frontend
```

### Key Data Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User/seller info | `user_id`, `stripe_connect_account_id`, `stripe_connect_status` |
| `products` | Marketplace items | `id`, `creator_id`, `downloads`, `price` |
| `sales` | Purchase records | `product_id`, `buyer_id`, `amount`, `created_at` |
| `bot_whitelisted_users` | Bot redemptions | `product_id`, `discord_id`, `discord_username` |
| `bot_products` | Bot product configs | `id`, `server_id`, `roblox_group_id` |

## Components and Interfaces

### 1. StripeSettings Component

**File:** `src/components/StripeSettings.tsx`

**Current Issue:** Reads from wrong columns (`stripe_account_id`, `stripe_onboarding_status`)

**Fix:** Update to read from correct columns:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('stripe_connect_account_id, stripe_connect_status')
  .eq('user_id', user.id)
  .single();
```

### 2. Product Page Component

**File:** `src/pages/ProductPage.tsx` (or similar)

**Current Issue:** Checks wrong column for seller Stripe status

**Fix:** Join profiles table and check `stripe_connect_status`:
```typescript
const { data: product } = await supabase
  .from('products')
  .select(`
    *,
    profiles!creator_id (
      stripe_connect_status,
      stripe_connect_account_id
    )
  `)
  .eq('id', productId)
  .single();

const canAcceptPayments = product?.profiles?.stripe_connect_status === 'complete';
```

### 3. Stripe Webhook

**File:** `supabase/functions/stripe-webhook/index.ts`

**Current Issue:** Doesn't create sales records

**Fix:** Add sales record creation after checkout completion:
```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const productId = session.metadata?.product_id;
  const amount = session.amount_total / 100;
  
  await supabase.from('sales').insert({
    product_id: productId,
    buyer_id: session.metadata?.buyer_id || null,
    amount: amount,
    created_at: new Date().toISOString()
  });
}
```

### 4. Store Analytics Dashboard

**File:** `src/pages/StoreAnalytics.tsx`

**Current Issue:** Queries are correct but no sales data exists

**Fix:** Ensure sales records exist (via webhook fix) and verify query:
```typescript
const { data: salesData } = await supabase
  .from('sales')
  .select('id, product_id, amount, created_at')
  .in('product_id', productIds)
  .gte('created_at', startDate.toISOString());

const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
const totalOrders = salesData?.length || 0;
```

### 5. Bot Dashboard

**File:** `src/pages/DeveloperBotDashboard.tsx`

**Current Issue:** Cache not clearing properly on refresh

**Fix:** Clear cache before fetching:
```typescript
const refreshServers = async () => {
  localStorage.removeItem(`${CACHE_KEY}_${user.id}`);
  await loadAllServers(false);
};
```

### 6. Bot Redemption Storage

**File:** `whitelisting_service/src/services/supabaseDatabase.js`

**Current Issue:** Not storing `discord_username`

**Fix:** Include username in insert:
```javascript
const insertData = {
  product_id: product.id,
  discord_id: redemptionData.discordUserId,
  discord_username: redemptionData.discordUsername || null,
  roblox_username: redemptionData.robloxUsername,
  // ...
};
```

## Data Models

### Profile Schema (Relevant Columns)
```sql
profiles (
  user_id UUID PRIMARY KEY,
  stripe_connect_account_id TEXT,      -- Stripe Connect account ID
  stripe_connect_status TEXT,          -- 'pending', 'complete', or NULL
  -- NOT: stripe_account_id, stripe_onboarding_status (deprecated)
)
```

### Sales Schema
```sql
sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  buyer_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stripe Status Display Mapping

*For any* Stripe connect status value, the UI SHALL display the correct indicator:
- 'complete' → "Connected" (green)
- 'pending' → "Pending" (yellow)  
- null/empty → "Not Connected" (prompt)

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Sales Record Creation on Checkout

*For any* successful Stripe checkout session with a product_id in metadata, a sales record SHALL be created with:
- product_id matching session.metadata.product_id
- amount equal to session.amount_total / 100
- created_at timestamp

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Sales Record Idempotency

*For any* checkout session, processing the webhook multiple times SHALL result in exactly one sales record (no duplicates).

**Validates: Requirements 2.4**

### Property 4: Revenue Calculation Accuracy

*For any* set of sales records for a seller's products, the displayed total revenue SHALL equal the sum of all `amount` values, and total orders SHALL equal the count of records.

**Validates: Requirements 3.2, 3.3**

### Property 5: Payment Availability Based on Status

*For any* product page, the purchase button availability SHALL be determined by the seller's `stripe_connect_status`:
- 'complete' → enabled
- anything else → disabled with message

**Validates: Requirements 4.2, 4.3**

### Property 6: Whitelist Count Grouping

*For any* set of bot products with the same `roblox_group_id`, they SHALL share the same whitelist count (counted from all products with that group ID).

**Validates: Requirements 5.2**

### Property 7: Discord Username Storage

*For any* bot redemption, the stored record SHALL include the `discord_username` if provided in the redemption data.

**Validates: Requirements 5.3**

### Property 8: Referential Integrity

*For any* record in `sales`, the `product_id` SHALL reference an existing product. *For any* record in `products`, the `creator_id` SHALL reference an existing user.

**Validates: Requirements 7.2, 7.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Stripe webhook fails | Log error, return 400, Stripe will retry |
| Sales insert fails | Log error, continue (don't block checkout) |
| Profile not found | Create profile with defaults |
| Invalid product_id | Skip sales record creation, log warning |
| Cache read fails | Fetch fresh data from database |

## Testing Strategy

### Unit Tests
- Test status mapping function (complete → connected, etc.)
- Test amount calculation (cents to dollars)
- Test query builders return correct column names

### Property-Based Tests
- Property 1: Generate random status values, verify correct display mapping
- Property 2: Generate random checkout sessions, verify sales record structure
- Property 4: Generate random sales arrays, verify sum/count calculations
- Property 6: Generate random product/whitelist configurations, verify count grouping

### Integration Tests
- End-to-end checkout flow creates sales record
- Dashboard displays correct totals after purchase
- Bot redemption stores username correctly

### Manual Verification
- Verify Stripe settings shows "Connected" for complete accounts
- Verify product pages show correct payment availability
- Verify dashboard shows revenue after test purchase
