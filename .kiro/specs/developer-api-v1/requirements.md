# Requirements Document

## Introduction

The Developer API v1 provides Vectabase developers with two core services: Lua code obfuscation and user whitelisting for Roblox products. The system includes subscription tiers (Free, Pro, Pro+, Enterprise) with varying limits, plus a pay-per-use option for obfuscation. All endpoints are rate-limited and authenticated via API keys.

## Glossary

- **Developer**: A Vectabase user who creates products and uses the API
- **API_Key**: Unique authentication token for API access
- **Obfuscation_Service**: Service that transforms Lua code to protect intellectual property
- **Whitelist_Service**: Service that manages user access to specific products
- **Product**: A developer-created item linked to a Roblox Group ID
- **Whitelisted_User**: A user granted access to a product via roblox_user_id and discord_id
- **Subscription_Tier**: Developer's plan level (Free, Pro, Pro+, Enterprise)
- **Rate_Limiter**: System that restricts API calls based on tier and time window
- **Obfuscation_Credit**: Single-use token for pay-per-use obfuscation (£1 each)

## Requirements

### Requirement 1: API Authentication

**User Story:** As a developer, I want to authenticate my API requests with an API key, so that my usage is tracked and secured.

#### Acceptance Criteria

1. WHEN a request is made without an API key, THE API_Gateway SHALL return a 401 Unauthorized error
2. WHEN a request is made with an invalid API key, THE API_Gateway SHALL return a 401 Unauthorized error
3. WHEN a request is made with a valid API key, THE API_Gateway SHALL process the request and track usage against the developer's account
4. THE API_Gateway SHALL accept the API key via the `X-API-Key` header
5. WHEN an API key is compromised, THE Developer SHALL be able to regenerate a new key from the dashboard

### Requirement 2: Subscription Tiers

**User Story:** As a developer, I want to choose a subscription tier that fits my needs, so that I can access appropriate API limits.

#### Acceptance Criteria

1. THE Subscription_Service SHALL support four tiers: Free, Pro (£7/month), Pro+ (£14/month), Enterprise (£25/month)
2. WHEN a developer is on Free tier, THE System SHALL allow 1 obfuscation per week
3. WHEN a developer is on Pro tier, THE System SHALL allow 20 obfuscations per day
4. WHEN a developer is on Pro+ tier, THE System SHALL allow unlimited obfuscations per day
5. WHEN a developer is on Enterprise tier, THE System SHALL allow unlimited obfuscations per day
6. WHEN a developer is on Free tier, THE System SHALL allow maximum 10 whitelisted users per product
7. WHEN a developer is on Pro tier, THE System SHALL allow maximum 100 whitelisted users per product
8. WHEN a developer is on Pro+ tier, THE System SHALL allow maximum 500 whitelisted users per product
9. WHEN a developer is on Enterprise tier, THE System SHALL allow unlimited whitelisted users per product

### Requirement 3: Pay-Per-Use Obfuscation Credits

**User Story:** As a developer, I want to purchase individual obfuscation credits, so that I can obfuscate code without a subscription.

#### Acceptance Criteria

1. THE Credit_Service SHALL allow developers to purchase obfuscation credits at £1 per credit
2. WHEN a developer has credits available, THE Obfuscation_Service SHALL deduct one credit per obfuscation
3. WHEN a developer has both subscription allowance and credits, THE System SHALL use subscription allowance first
4. THE Dashboard SHALL display the developer's current credit balance
5. WHEN a developer attempts to obfuscate without credits or subscription allowance, THE System SHALL return an error with purchase options

### Requirement 4: Obfuscation API

**User Story:** As a developer, I want to obfuscate my Lua code via API, so that I can protect my intellectual property.

#### Acceptance Criteria

1. WHEN a developer submits valid Lua code to `/api/v1/obfuscate`, THE Obfuscation_Service SHALL return obfuscated code
2. THE Obfuscation_Service SHALL accept Lua code via POST request body with `code` field
3. WHEN the submitted code is empty or invalid, THE Obfuscation_Service SHALL return a 400 Bad Request error
4. WHEN the developer has exceeded their tier limit, THE Obfuscation_Service SHALL return a 429 Too Many Requests error
5. THE Obfuscation_Service SHALL return the obfuscated code in the response body with `obfuscated_code` field
6. WHEN obfuscation succeeds, THE System SHALL increment the developer's usage counter

### Requirement 5: Rate Limiting

**User Story:** As a platform operator, I want to rate limit API requests, so that the system remains stable and fair.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce per-minute request limits on all endpoints
2. WHEN a developer exceeds the rate limit, THE API_Gateway SHALL return a 429 Too Many Requests error with `Retry-After` header
3. THE Rate_Limiter SHALL apply the following limits per tier:
   - Free: 10 requests per minute
   - Pro: 30 requests per minute
   - Pro+: 60 requests per minute
   - Enterprise: 120 requests per minute
4. THE Rate_Limiter SHALL track limits per API key, not per IP address
5. WHEN rate limit is exceeded, THE Response SHALL include `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers

### Requirement 6: Product Management

**User Story:** As a developer, I want to create products linked to my Roblox groups, so that I can manage whitelists for each product.

#### Acceptance Criteria

1. WHEN a developer creates a product, THE System SHALL require: product_name, roblox_group_id
2. THE System SHALL NOT allow two products with the same roblox_group_id for the same developer
3. WHEN a developer attempts to create a duplicate product for the same group, THE System SHALL return a 409 Conflict error
4. THE Product_Service SHALL store the roblox_group_id for whitelist verification
5. WHEN a developer deletes a product, THE System SHALL remove all associated whitelisted users

### Requirement 7: Whitelist API

**User Story:** As a developer, I want to whitelist users for my products via API, so that I can grant access to paying customers.

#### Acceptance Criteria

1. WHEN a developer calls `/api/v1/whitelist`, THE Whitelist_Service SHALL require: product_id, roblox_user_id, discord_id, expiry_date
2. THE Whitelist_Service SHALL retrieve the roblox_group_id from the specified product
3. WHEN the product_id is invalid or doesn't belong to the developer, THE Whitelist_Service SHALL return a 404 Not Found error
4. WHEN the developer has reached their tier's whitelist limit for that product, THE Whitelist_Service SHALL return a 403 Forbidden error
5. WHEN a user is already whitelisted for the product, THE Whitelist_Service SHALL update the existing entry (upsert behavior)
6. THE Whitelist_Service SHALL store: roblox_user_id, discord_id, expiry_date, product_id, created_at, updated_at
7. WHEN the expiry_date is in the past, THE Whitelist_Service SHALL return a 400 Bad Request error

### Requirement 8: Whitelist Removal

**User Story:** As a developer, I want to remove users from my whitelist, so that I can revoke access when needed.

#### Acceptance Criteria

1. WHEN a developer calls DELETE `/api/v1/whitelist/{whitelist_id}`, THE Whitelist_Service SHALL remove the user from the whitelist
2. WHEN the whitelist entry doesn't exist or doesn't belong to the developer, THE Whitelist_Service SHALL return a 404 Not Found error
3. THE Whitelist_Service SHALL support bulk removal via POST `/api/v1/whitelist/bulk-remove` with array of whitelist_ids

### Requirement 9: Whitelist Query

**User Story:** As a developer, I want to query my whitelisted users, so that I can verify access and manage my customer base.

#### Acceptance Criteria

1. WHEN a developer calls GET `/api/v1/whitelist?product_id={id}`, THE Whitelist_Service SHALL return all whitelisted users for that product
2. THE Response SHALL include: whitelist_id, roblox_user_id, discord_id, expiry_date, created_at
3. THE Whitelist_Service SHALL support pagination via `page` and `limit` query parameters
4. THE Whitelist_Service SHALL support filtering by roblox_user_id or discord_id query parameters
5. WHEN querying without product_id, THE Whitelist_Service SHALL return a 400 Bad Request error

### Requirement 10: Whitelist Verification (Bot Endpoint)

**User Story:** As a Roblox game, I want to verify if a user is whitelisted, so that I can grant in-game access.

#### Acceptance Criteria

1. WHEN a verification request is made to `/api/v1/verify`, THE Verification_Service SHALL require: roblox_user_id, roblox_group_id
2. THE Verification_Service SHALL check if the user has an active (non-expired) whitelist entry for any product with that group_id
3. WHEN the user is whitelisted and not expired, THE Verification_Service SHALL return `{ "whitelisted": true, "expiry_date": "..." }`
4. WHEN the user is not whitelisted or expired, THE Verification_Service SHALL return `{ "whitelisted": false }`
5. THE Verification_Service SHALL be rate-limited but accessible without developer API key (uses group_id for lookup)

### Requirement 11: Usage Dashboard

**User Story:** As a developer, I want to view my API usage statistics, so that I can monitor my consumption.

#### Acceptance Criteria

1. THE Dashboard SHALL display current subscription tier and renewal date
2. THE Dashboard SHALL display obfuscation usage: used/limit for current period
3. THE Dashboard SHALL display available obfuscation credits
4. THE Dashboard SHALL display whitelist counts per product with tier limits
5. THE Dashboard SHALL display API request history with timestamps and endpoints

### Requirement 12: Error Responses

**User Story:** As a developer, I want clear error messages, so that I can debug issues with my API integration.

#### Acceptance Criteria

1. THE API_Gateway SHALL return errors in consistent JSON format: `{ "error": "code", "message": "description" }`
2. THE API_Gateway SHALL use appropriate HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limited), 500 (server error)
3. WHEN validation fails, THE Response SHALL include field-specific error details
4. THE API_Gateway SHALL include a unique request_id in all responses for debugging

