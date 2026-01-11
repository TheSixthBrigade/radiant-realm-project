# Requirements Document

## Introduction

This specification addresses critical data flow issues across the Radiant Realm platform. The platform has inconsistent database column naming, broken Stripe integration display, missing sales records, and dashboard analytics not reflecting actual data. This fix will ensure all data flows correctly from purchases through to seller dashboards.

## Glossary

- **Platform**: The Radiant Realm marketplace and bot system
- **Seller_Dashboard**: The analytics page showing revenue, sales, and downloads for sellers
- **Bot_Dashboard**: The Discord bot management interface showing whitelist counts
- **Stripe_Connect**: Stripe's system for marketplace payments to sellers
- **Profile**: User profile record containing payment and identity information
- **Product**: A sellable item in the marketplace
- **Sale**: A record of a completed purchase transaction

## Requirements

### Requirement 1: Stripe Connect Status Display

**User Story:** As a seller, I want to see my correct Stripe connection status, so that I know if I can receive payments.

#### Acceptance Criteria

1. WHEN a seller views their profile settings, THE Platform SHALL display the correct Stripe connection status from the `stripe_connect_status` column
2. WHEN `stripe_connect_status` equals 'complete', THE Platform SHALL show "Connected" with a green indicator
3. WHEN `stripe_connect_status` equals 'pending', THE Platform SHALL show "Pending" with a yellow indicator
4. WHEN `stripe_connect_status` is null or empty, THE Platform SHALL show "Not Connected" with a prompt to connect
5. WHEN viewing a product page, THE Platform SHALL check the seller's `stripe_connect_status` column to determine payment availability

### Requirement 2: Sales Record Creation

**User Story:** As a seller, I want all purchases to create sales records, so that my dashboard shows accurate revenue.

#### Acceptance Criteria

1. WHEN a Stripe checkout completes successfully, THE Platform SHALL create a record in the `sales` table
2. THE sales record SHALL include product_id, buyer_id (if available), amount, and created_at timestamp
3. WHEN the webhook receives `checkout.session.completed`, THE Platform SHALL extract the amount from `session.amount_total` divided by 100
4. IF a sales record already exists for the same session, THE Platform SHALL not create a duplicate

### Requirement 3: Seller Dashboard Analytics

**User Story:** As a seller, I want my dashboard to show accurate sales data, so that I can track my business performance.

#### Acceptance Criteria

1. WHEN a seller views their analytics dashboard, THE Platform SHALL query the `sales` table for their products
2. THE Platform SHALL calculate total revenue by summing the `amount` column from sales records
3. THE Platform SHALL calculate total orders by counting sales records
4. THE Platform SHALL display downloads from the `products.downloads` column
5. WHEN new sales occur, THE Platform SHALL update the dashboard via real-time subscription

### Requirement 4: Product Page Payment Status

**User Story:** As a buyer, I want to know if a seller can accept payments, so that I don't waste time on unavailable products.

#### Acceptance Criteria

1. WHEN displaying a product page, THE Platform SHALL check the seller's `stripe_connect_status` from the `profiles` table
2. IF `stripe_connect_status` equals 'complete', THE Platform SHALL enable the purchase button
3. IF `stripe_connect_status` does not equal 'complete', THE Platform SHALL show "Seller has not connected Stripe" message
4. THE Platform SHALL join `products.creator_id` to `profiles.user_id` to get the seller's Stripe status

### Requirement 5: Bot Dashboard Whitelist Counts

**User Story:** As a seller using the Discord bot, I want to see accurate whitelist counts, so that I know how many users have redeemed keys.

#### Acceptance Criteria

1. WHEN viewing the bot dashboard, THE Platform SHALL count records from `bot_whitelisted_users` table
2. THE Platform SHALL group whitelist counts by `roblox_group_id` to share counts across copied configs
3. WHEN a new redemption occurs, THE Platform SHALL store `discord_username` along with `discord_id`
4. THE refresh button SHALL clear localStorage cache and fetch fresh data from Supabase

### Requirement 6: Database Column Consistency

**User Story:** As a developer, I want consistent column naming, so that the codebase is maintainable.

#### Acceptance Criteria

1. THE Platform SHALL use `stripe_connect_account_id` for the Stripe account identifier (not `stripe_account_id`)
2. THE Platform SHALL use `stripe_connect_status` for the connection status (not `stripe_onboarding_status`)
3. ALL frontend components SHALL read from the correct column names
4. ALL edge functions SHALL write to the correct column names

### Requirement 7: Data Cleanup

**User Story:** As a platform operator, I want clean data without orphaned records, so that the system runs efficiently.

#### Acceptance Criteria

1. THE Platform SHALL remove any orphaned records that reference non-existent foreign keys
2. THE Platform SHALL ensure all products have valid `creator_id` references
3. THE Platform SHALL ensure all sales have valid `product_id` references
4. THE Platform SHALL remove duplicate or test data that pollutes analytics
