# Design Document: Platform Enhancements

## Overview

This design covers 12 major platform enhancements that add voting, changelogs, notifications, reviews, discounts, bundles, affiliates, analytics, versioning, license keys, and download tracking to the Vectabase marketplace.

## Architecture

The enhancements follow the existing architecture:
- **Frontend**: React components with Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email**: Resend API with support@vectabase.com sender
- **Payments**: Stripe Connect (existing)

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  RoadmapPage  │  Analytics  │  Reviews  │  Affiliates       │
│  (+ voting)   │  Dashboard  │  System   │  Dashboard        │
└───────┬───────┴──────┬──────┴─────┬─────┴───────┬───────────┘
        │              │            │             │
        ▼              ▼            ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL   │  Edge Functions  │  Storage  │  Auth        │
│  (all tables) │  (email, keys)   │  (files)  │  (users)     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Roadmap Voting Component

```typescript
interface RoadmapVotingSettings {
  voting_enabled: boolean;
  sort_by_votes: boolean;
  allow_anonymous_view: boolean; // show votes to non-logged users
}

interface RoadmapItemVote {
  id: string;
  item_id: string;
  user_id: string;
  created_at: string;
}

// Added to existing RoadmapItem
interface RoadmapItem {
  // ... existing fields
  vote_count: number;
  user_has_voted?: boolean;
}
```

### 2. Changelog Component

```typescript
interface Changelog {
  id: string;
  product_id: string;
  version_id: string;
  version_name: string;
  title: string;
  content: string; // markdown
  release_date: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface ChangelogEntry {
  type: 'added' | 'changed' | 'fixed' | 'removed';
  description: string;
}
```

### 3. Email Notification System

```typescript
interface EmailNotification {
  id: string;
  user_id: string;
  product_id: string;
  type: 'version_release' | 'review_response' | 'affiliate_sale';
  sent_at: string;
  email_id: string; // from Resend
}

interface NotificationPreference {
  user_id: string;
  product_id: string;
  email_enabled: boolean;
}
```

### 4. Reviews System

```typescript
interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  owner_response?: string;
  owner_response_at?: string;
  helpful_count: number;
}

interface ReviewSummary {
  product_id: string;
  average_rating: number;
  total_reviews: number;
  rating_distribution: { [key: number]: number }; // 1-5 counts
}
```

### 5. Discount Codes

```typescript
interface DiscountCode {
  id: string;
  creator_id: string;
  code: string; // uppercase, unique per creator
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number; // cap for percentage
  product_ids?: string[]; // null = all products
  usage_limit?: number;
  usage_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface DiscountUsage {
  id: string;
  code_id: string;
  user_id: string;
  order_id: string;
  discount_amount: number;
  used_at: string;
}
```

### 6. Product Bundles

```typescript
interface ProductBundle {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  image_url?: string;
  product_ids: string[];
  bundle_price: number; // discounted price
  original_price: number; // sum of individual prices
  is_active: boolean;
  created_at: string;
}
```

### 7. Affiliate System

```typescript
interface AffiliateSettings {
  creator_id: string;
  is_enabled: boolean;
  commission_rate: number; // 0.0 to 1.0 (e.g., 0.1 = 10%)
  min_payout: number; // minimum for withdrawal
  cookie_days: number; // attribution window
}

interface AffiliateLink {
  id: string;
  user_id: string;
  creator_id: string;
  code: string; // unique referral code
  clicks: number;
  conversions: number;
  earnings: number;
  created_at: string;
}

interface AffiliateReferral {
  id: string;
  link_id: string;
  sale_id: string;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
}
```

### 8. Analytics Data Models

```typescript
interface SalesAnalytics {
  period: string; // date
  revenue: number;
  orders: number;
  unique_customers: number;
}

interface ProductAnalytics {
  product_id: string;
  product_name: string;
  revenue: number;
  units_sold: number;
  conversion_rate: number;
}

interface CustomerInsight {
  total_customers: number;
  repeat_customers: number;
  new_customers_period: number;
  top_countries: { country: string; count: number }[];
  top_customers: { user_id: string; total_spent: number }[];
}
```

### 9. Product Versioning

```typescript
interface ProductVersion {
  id: string;
  product_id: string;
  version_number: string; // semver: 1.0.0
  file_url: string;
  file_size: number;
  changelog: string;
  is_current: boolean;
  created_at: string;
}
```

### 10. License Keys

```typescript
interface LicenseKey {
  id: string;
  product_id: string;
  sale_id: string;
  user_id: string;
  key: string; // format: XXXX-XXXX-XXXX-XXXX
  status: 'active' | 'revoked' | 'expired';
  activations: number;
  max_activations?: number;
  expires_at?: string;
  created_at: string;
}

interface LicenseActivation {
  id: string;
  license_id: string;
  machine_id: string;
  ip_address: string;
  activated_at: string;
  deactivated_at?: string;
}
```

### 11. Download Tracking

```typescript
interface DownloadEvent {
  id: string;
  product_id: string;
  version_id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  downloaded_at: string;
}

interface DownloadStats {
  product_id: string;
  total_downloads: number;
  unique_downloaders: number;
  downloads_by_version: { version: string; count: number }[];
  downloads_over_time: { date: string; count: number }[];
}
```

## Data Models

### Database Schema Additions

```sql
-- Roadmap Voting
CREATE TABLE roadmap_item_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

-- Add voting settings to products
ALTER TABLE products ADD COLUMN voting_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN sort_by_votes BOOLEAN DEFAULT false;

-- Changelogs
CREATE TABLE changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  version_id UUID REFERENCES roadmap_versions(id),
  version_name TEXT NOT NULL,
  title TEXT,
  content TEXT,
  release_date TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  UNIQUE(user_id, product_id)
);

-- Reviews
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Discount Codes
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL NOT NULL,
  min_purchase DECIMAL,
  max_discount DECIMAL,
  product_ids UUID[],
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, code)
);

-- Discount Usage
CREATE TABLE discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  sale_id UUID REFERENCES sales(id),
  discount_amount DECIMAL NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Bundles
CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_ids UUID[] NOT NULL,
  bundle_price DECIMAL NOT NULL,
  original_price DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Settings
CREATE TABLE affiliate_settings (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  commission_rate DECIMAL DEFAULT 0.1,
  min_payout DECIMAL DEFAULT 50,
  cookie_days INTEGER DEFAULT 30
);

-- Affiliate Links
CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  earnings DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Referrals
CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  commission_amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Versions
CREATE TABLE product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- License Keys
CREATE TABLE license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  activations INTEGER DEFAULT 0,
  max_activations INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- License Activations
CREATE TABLE license_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES license_keys(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  ip_address INET,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

-- Download Events
CREATE TABLE download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  version_id UUID REFERENCES product_versions(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add license_enabled to products
ALTER TABLE products ADD COLUMN license_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN max_activations INTEGER;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Vote Uniqueness and Count Integrity
*For any* roadmap item and user, the vote count should equal the number of unique users who have voted, and a user can only have one vote per item.
**Validates: Requirements 1.3, 1.6**

### Property 2: Vote Display Consistency
*For any* roadmap with voting enabled, all items should display vote counts and vote buttons; when disabled, buttons should be hidden.
**Validates: Requirements 1.2, 1.5**

### Property 3: Vote Sorting Correctness
*For any* roadmap with sort_by_votes enabled, items should be returned in descending order of vote count.
**Validates: Requirements 1.7**

### Property 4: Changelog Generation Completeness
*For any* released version, the auto-generated changelog should contain the version name, release date, and all completed items from that version.
**Validates: Requirements 2.1, 2.2**

### Property 5: Changelog Visibility
*For any* changelog, it should only be visible to visitors when is_published is true.
**Validates: Requirements 2.5**

### Property 6: Email Notification Delivery
*For any* product version release, all buyers with email_enabled=true should receive a notification email.
**Validates: Requirements 3.1, 3.5**

### Property 7: Email Content Completeness
*For any* version release notification email, it should contain product name, version number, changelog summary, and download link.
**Validates: Requirements 3.2, 3.4**

### Property 8: Review Authorization
*For any* user attempting to leave a review, they should only succeed if they have a completed purchase for that product.
**Validates: Requirements 4.1, 4.5**

### Property 9: Rating Bounds
*For any* review, the rating value should be between 1 and 5 inclusive.
**Validates: Requirements 4.2**

### Property 10: Average Rating Calculation
*For any* product with reviews, the displayed average rating should equal the sum of all ratings divided by the number of reviews.
**Validates: Requirements 4.3**

### Property 11: Discount Code Validation
*For any* discount code application, the code should be rejected if expired, usage_count >= usage_limit, or is_active is false.
**Validates: Requirements 5.4**

### Property 12: Discount Calculation Correctness
*For any* valid discount code, the applied discount should equal: percentage type = min(total * rate, max_discount), fixed type = discount_value.
**Validates: Requirements 5.3**

### Property 13: Product-Specific Discount Scope
*For any* discount code with product_ids set, it should only apply to products in that list.
**Validates: Requirements 5.6**

### Property 14: Bundle Access Grant
*For any* bundle purchase, the buyer should have access to all products in the bundle's product_ids array.
**Validates: Requirements 6.4**

### Property 15: Bundle Savings Display
*For any* bundle, the displayed savings should equal original_price - bundle_price.
**Validates: Requirements 6.5**

### Property 16: Affiliate Link Uniqueness
*For any* affiliate link, the code should be unique across all links.
**Validates: Requirements 7.2**

### Property 17: Affiliate Commission Calculation
*For any* affiliate referral, the commission_amount should equal sale_amount * commission_rate from affiliate_settings.
**Validates: Requirements 7.4**

### Property 18: Affiliate Payout Threshold
*For any* affiliate requesting payout, the request should only be allowed if total earnings >= min_payout.
**Validates: Requirements 7.5**

### Property 19: Analytics Date Filtering
*For any* analytics query with date range, all returned data should fall within the specified start and end dates.
**Validates: Requirements 8.3**

### Property 20: Period Comparison Calculation
*For any* analytics comparison, the percentage change should equal ((current - previous) / previous) * 100.
**Validates: Requirements 8.4**

### Property 21: Customer Metrics Accuracy
*For any* customer insights query, repeat_customers should equal users with more than one purchase.
**Validates: Requirements 9.2**

### Property 22: Top Customers Ordering
*For any* top customers list, customers should be sorted by total_spent in descending order.
**Validates: Requirements 9.4**

### Property 23: Version History Preservation
*For any* product, all uploaded versions should be preserved in version history with their metadata.
**Validates: Requirements 10.2**

### Property 24: Current Version Selection
*For any* product download, the version with is_current=true should be served by default.
**Validates: Requirements 10.3**

### Property 25: License Key Uniqueness
*For any* generated license key, the key string should be unique across all license keys.
**Validates: Requirements 11.2**

### Property 26: License Verification API
*For any* license key verification request, the API should return the correct status (active/revoked/expired).
**Validates: Requirements 11.4**

### Property 27: Download Event Recording
*For any* product download, a download_event record should be created with product_id, user_id, and timestamp.
**Validates: Requirements 12.1**

### Property 28: Download Statistics Accuracy
*For any* product, total_downloads should equal COUNT of download_events, unique_downloaders should equal COUNT DISTINCT user_id.
**Validates: Requirements 12.2**

### Property 29: First vs Re-download Classification
*For any* download event, it should be classified as first_download if no prior download_event exists for that user+product combination.
**Validates: Requirements 12.5**

## Error Handling

### Voting Errors
- User not logged in: Show login prompt
- Already voted: Toggle vote off instead of error
- Voting disabled: Hide vote buttons, no error

### Discount Code Errors
- Invalid code: "This code is not valid"
- Expired code: "This code has expired"
- Usage limit reached: "This code has reached its usage limit"
- Wrong product: "This code cannot be applied to these products"
- Minimum not met: "Minimum purchase of $X required"

### Review Errors
- Not purchased: "You must purchase this product to leave a review"
- Already reviewed: Allow edit instead of new review
- Invalid rating: Enforce 1-5 in UI

### Affiliate Errors
- Program disabled: "Affiliate program is not available for this store"
- Below threshold: "Minimum payout amount is $X. Current balance: $Y"

### License Key Errors
- Invalid key: "License key not found"
- Revoked: "This license has been revoked"
- Expired: "This license has expired"
- Max activations: "Maximum activations reached"

## Testing Strategy

### Unit Tests
- Discount calculation functions
- Commission calculation functions
- Rating average calculation
- License key generation format
- Date range filtering logic

### Property-Based Tests
- Vote count integrity (Property 1)
- Discount validation rules (Property 11)
- License key uniqueness (Property 25)
- Download statistics accuracy (Property 28)

### Integration Tests
- Full voting flow (vote, unvote, count update)
- Discount code checkout flow
- Bundle purchase and access grant
- Affiliate tracking through purchase
- Email notification delivery

### E2E Tests
- Owner enables voting, user votes
- Owner creates discount, buyer applies at checkout
- Buyer leaves review, owner responds
- Affiliate link click through to purchase
