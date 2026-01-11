# Implementation Plan: Platform Data Fix

## Overview

This plan fixes all data flow issues across the platform by updating components to use correct column names, ensuring sales records are created, and cleaning up the database.

## Tasks

- [x] 1. Fix Product Page Stripe Status Check
  - [x] 1.1 Update product page query to join profiles and check `stripe_connect_status`
    - Find the product page component that shows "Seller has not connected Stripe"
    - Update the query to select `profiles.stripe_connect_status` via join on `creator_id`
    - Update the condition to check `stripe_connect_status === 'complete'`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [-] 2. Fix All Components Using Wrong Stripe Column Names
  - [x] 2.1 Search and fix any remaining references to `stripe_account_id` or `stripe_onboarding_status`
    - Search codebase for `stripe_account_id` and `stripe_onboarding_status`
    - Replace with `stripe_connect_account_id` and `stripe_connect_status`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Fix edge functions using wrong column names
    - Check all edge functions in `supabase/functions/`
    - Update any that read/write wrong column names
    - Deploy updated functions (stripe-check-accounts fixed and deployed)
    - _Requirements: 6.4_

- [x] 3. Verify and Deploy Stripe Webhook
  - [x] 3.1 Verify stripe-webhook creates sales records correctly
    - Review the webhook code for sales record creation
    - Ensure it handles missing product_id gracefully
    - Deploy the updated webhook function
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Database Cleanup
  - [x] 4.1 Run SQL to verify data integrity
    - Check for orphaned sales records (product_id not in products)
    - Check for orphaned products (creator_id not in profiles)
    - Check for duplicate records
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Create missing sales records for existing downloads
    - Query products with downloads > 0 but no sales records
    - Create sales records to match download counts
    - (1 sales record exists for Coastal product with 1 download)
    - _Requirements: 2.1_

  - [x] 4.3 Clean up test/junk data
    - Remove any test records that pollute analytics
    - Ensure only real data remains
    - _Requirements: 7.4_

- [x] 5. Checkpoint - Verify Stripe Status Display
  - Test that profile settings shows correct Stripe status
  - Test that product pages show correct payment availability
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix Onboarding Flow
  - [x] 6.1 Update Onboarding page to use correct column names
    - Check `src/pages/Onboarding.tsx` for column references
    - Update any wrong column names
    - (Already using correct columns via useOnboardingStatus hook)
    - _Requirements: 1.1, 6.3_

  - [x] 6.2 Verify onboarding status hook uses correct columns
    - Check `src/hooks/useOnboardingStatus.tsx`
    - Ensure it reads `stripe_connect_status`
    - (Already correct - uses stripe_connect_account_id and stripe_connect_status)
    - _Requirements: 1.1_

- [x] 7. Create Steering Documentation
  - [x] 7.1 Create database schema steering file
    - Document correct column names for profiles table
    - Document the sales table structure
    - Add to `.kiro/steering/database-schema.md`
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Create Stripe integration steering file
    - Document the correct flow for Stripe Connect
    - Document webhook handling
    - Add to `.kiro/steering/stripe-integration.md`
    - _Requirements: 2.1, 4.1_

- [x] 8. Final Checkpoint
  - [x] Verify all dashboards show correct data (1 sale record exists for $0.50)
  - [x] Verify Stripe status displays correctly everywhere (product page shows Buy Now, not "Seller not connected")
  - [x] Verify bot dashboard shows whitelist counts (whitelist table is empty - needs new redemptions)
  - All column name fixes deployed and working

## Notes

- Several fixes have already been applied (StripeSettings, webhook, bot redemption)
- Focus on finding and fixing remaining broken references
- Database cleanup should be done carefully to avoid data loss
- All edge function changes require deployment via Supabase MCP
