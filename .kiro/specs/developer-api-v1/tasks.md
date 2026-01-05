# Implementation Plan: Developer API v1

## Overview

This implementation plan covers the Developer API v1 with obfuscation and whitelist services, subscription tiers, rate limiting, and pay-per-use credits. The implementation uses Supabase Edge Functions (Deno/TypeScript) with PostgreSQL.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create database migration for all API tables
    - Create `developer_api_keys` table with unique constraint on api_key
    - Create `developer_subscriptions` table with tier enum check
    - Create `obfuscation_credits` table with non-negative check
    - Create `obfuscation_usage` table for tracking
    - Create `developer_products` table with unique (developer_id, roblox_group_id) constraint
    - Create `whitelist_entries` table with unique (product_id, roblox_user_id) constraint
    - Create `api_request_logs` table for usage dashboard
    - Add all indexes for performance
    - _Requirements: 6.1, 6.2, 7.6_

  - [x] 1.2 Create Row Level Security (RLS) policies
    - Developers can only access their own API keys, products, whitelist entries
    - Service role can access all for Edge Functions
    - _Requirements: 1.3_

- [x] 2. Core Utilities and Middleware
  - [x] 2.1 Create shared types and constants
    - Define TypeScript interfaces for all API requests/responses
    - Define subscription tier constants with limits
    - Define error codes and messages
    - Create `supabase/functions/_shared/types.ts`
    - _Requirements: 2.1, 12.1_

  - [x] 2.2 Create authentication middleware
    - Implement `authenticateRequest()` function
    - Validate X-API-Key header
    - Return developer context with tier info
    - Return 401 for missing/invalid keys
    - Create `supabase/functions/_shared/auth.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.3 Write property test for authentication
    - **Property 1: Authentication Enforcement**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.4 Create rate limiter middleware
    - Implement `checkRateLimit()` function using in-memory Map (or Redis if available)
    - Track requests per API key per minute
    - Return rate limit headers on all responses
    - Return 429 with Retry-After when exceeded
    - Create `supabase/functions/_shared/rateLimit.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.5 Write property tests for rate limiting
    - **Property 2: Rate Limit Enforcement**
    - **Property 3: Rate Limit Per API Key**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 2.6 Create response helpers
    - Implement `successResponse()` and `errorResponse()` functions
    - Include request_id in all responses
    - Implement CORS headers
    - Create `supabase/functions/_shared/response.ts`
    - _Requirements: 12.1, 12.4_

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all shared utilities compile without errors
  - Ask the user if questions arise

- [x] 4. Product Service
  - [x] 4.1 Create product management Edge Function
    - POST: Create product with name and roblox_group_id
    - GET: List all products for developer
    - DELETE: Delete product by ID (cascades to whitelist)
    - Enforce unique group_id per developer (409 on duplicate)
    - Create `supabase/functions/api-products/index.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 4.2 Write property tests for product service
    - **Property 8: Product Group ID Uniqueness**
    - **Property 9: Product Deletion Cascade**
    - **Validates: Requirements 6.2, 6.3, 6.5**

- [x] 5. Whitelist Service
  - [x] 5.1 Create whitelist management Edge Function
    - POST: Add/update whitelist entry (upsert behavior)
    - GET: List whitelist entries with pagination and filtering
    - DELETE: Remove single whitelist entry
    - Validate required fields (product_id, roblox_user_id, discord_id, expiry_date)
    - Validate expiry_date is in future
    - Enforce tier whitelist limits
    - Create `supabase/functions/api-whitelist/index.ts`
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 5.2 Write property tests for whitelist service
    - **Property 10: Whitelist Required Fields**
    - **Property 11: Whitelist Tier Limits**
    - **Property 12: Whitelist Upsert Behavior**
    - **Property 13: Whitelist Expiry Validation**
    - **Property 14: Whitelist Query Completeness**
    - **Property 15: Whitelist Pagination**
    - **Property 16: Whitelist Filtering**
    - **Validates: Requirements 7.1, 7.4, 7.5, 7.7, 9.1, 9.3, 9.4**

  - [x] 5.3 Create bulk whitelist removal endpoint
    - POST /bulk-remove: Remove multiple entries by ID array
    - Return count of removed and failed IDs
    - _Requirements: 8.3_

- [x] 6. Checkpoint - Product and Whitelist services complete
  - Ensure all tests pass
  - Ask the user if questions arise

- [x] 7. Verification Service (Public)
  - [x] 7.1 Create verification Edge Function
    - POST: Verify user whitelist status by roblox_user_id and roblox_group_id
    - No API key required (public endpoint)
    - Check for non-expired whitelist entry
    - Return whitelisted: true/false with expiry_date if applicable
    - Apply rate limiting (separate from authenticated endpoints)
    - Create `supabase/functions/api-verify/index.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 7.2 Write property test for verification
    - **Property 17: Verification Correctness**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 8. Obfuscation Service
  - [x] 8.1 Create obfuscation Edge Function
    - POST: Accept Lua code, return obfuscated code
    - Validate code is not empty
    - Check subscription tier limits
    - Check and use credits if subscription exhausted
    - Track usage in obfuscation_usage table
    - Call existing Python obfuscator API
    - Create `supabase/functions/api-obfuscate/index.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 8.2 Write property tests for obfuscation limits
    - **Property 4: Obfuscation Tier Limits**
    - **Property 5: Credit Deduction**
    - **Property 6: Subscription Before Credits**
    - **Property 7: Obfuscation Usage Tracking**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 4.4, 4.6**

- [x] 9. Checkpoint - All API services complete
  - Ensure all tests pass
  - Test each endpoint manually
  - Ask the user if questions arise

- [x] 10. Subscription and Credits Management
  - [x] 10.1 Create subscription management Edge Function
    - GET: Get current subscription status
    - Integrate with Stripe for subscription management
    - Create `supabase/functions/api-subscription/index.ts`
    - _Requirements: 2.1_

  - [x] 10.2 Create credits purchase Edge Function
    - POST: Purchase obfuscation credits (£1 each)
    - Integrate with Stripe for one-time payments
    - Create `supabase/functions/api-credits/index.ts`
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 10.3 Create Stripe webhook handler for subscriptions
    - Handle subscription created/updated/cancelled events
    - Update developer_subscriptions table
    - Create `supabase/functions/stripe-subscription-webhook/index.ts`
    - _Requirements: 2.1_

- [x] 11. API Key Management
  - [x] 11.1 Create API key management Edge Function
    - POST: Generate new API key
    - GET: List API keys for developer
    - DELETE: Revoke API key
    - Create `supabase/functions/api-keys/index.ts`
    - _Requirements: 1.5_

- [x] 12. Usage Dashboard API
  - [x] 12.1 Create usage statistics Edge Function
    - GET: Return usage stats (obfuscation used/limit, credits, whitelist counts)
    - GET: Return API request history with pagination
    - Create `supabase/functions/api-usage/index.ts`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13. Error Handling and Validation
  - [x] 13.1 Create validation utilities
    - Implement field validation with detailed error messages
    - Implement request body parsing with error handling
    - Create `supabase/functions/_shared/validation.ts`
    - _Requirements: 12.2, 12.3_

  - [ ]* 13.2 Write property tests for error responses
    - **Property 18: Error Response Format**
    - **Property 19: Validation Error Details**
    - **Validates: Requirements 12.1, 12.3, 12.4**

- [x] 14. Frontend Dashboard Updates
  - [x] 14.1 Update DeveloperAPI.tsx page
    - Display API key management UI
    - Display subscription tier and upgrade options
    - Display obfuscation usage and credits
    - Display whitelist counts per product
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 14.2 Update DeveloperDocs.tsx with API documentation
    - Document all endpoints with examples
    - Document authentication (X-API-Key header)
    - Document rate limits per tier
    - Document error codes and responses
    - _Requirements: 12.1, 12.2_

- [x] 15. Final Checkpoint
  - Ensure all tests pass
  - Deploy all Edge Functions
  - Test end-to-end flow
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All Edge Functions use Deno runtime with TypeScript
- Rate limiting uses in-memory Map initially (can upgrade to Redis later)
