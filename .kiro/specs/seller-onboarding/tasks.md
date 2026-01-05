# Implementation Plan: Seller Onboarding

## Overview

Implement a multi-step seller onboarding flow with TOS agreement, business profile collection, and Stripe Connect integration. The implementation follows a database-first approach, then hooks/services, then UI components.

## Tasks

- [x] 1. Database schema updates
  - [x] 1.1 Add onboarding fields to profiles table
    - Add tos_agreed_at, tos_version, business_name, business_description, contact_email, onboarding_completed_at columns
    - _Requirements: 1.3, 3.1, 3.2, 3.4_

- [x] 2. Create onboarding status hook and utilities
  - [x] 2.1 Create useOnboardingStatus hook
    - Fetch and compute onboarding status from profile
    - Provide updateStatus function for saving progress
    - _Requirements: 2.2, 2.3_
  
  - [x] 2.2 Write property test for onboarding completeness check
    - **Property 2: Onboarding Status Completeness Check**
    - **Validates: Requirements 2.3, 2.5**

- [x] 3. Create protected route wrapper
  - [x] 3.1 Create SellerRoute component
    - Check onboarding status on mount
    - Redirect to /onboarding if incomplete
    - _Requirements: 1.4, 1.5, 2.1_
  
  - [x] 3.2 Write property test for TOS access control
    - **Property 1: TOS Agreement Blocks Seller Access**
    - **Validates: Requirements 1.4, 1.5**

- [x] 4. Create onboarding page and steps
  - [x] 4.1 Create Onboarding page component with step navigation
    - Progress indicator showing current/total steps
    - Next/Back navigation
    - Dark theme glass card styling
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 4.2 Create TOS Agreement step component
    - Display TOS summary with link to full terms
    - Checkbox for agreement
    - Save tos_agreed_at and tos_version on submit
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 4.3 Create Business Profile step component
    - Form fields: business_name (required), business_description (optional, max 500), contact_email (defaults to account email)
    - Inline validation with error messages
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_
  
  - [x] 4.4 Write property test for business profile validation
    - **Property 4: Business Profile Validation**
    - **Validates: Requirements 3.2, 3.5, 3.6**
  
  - [x] 4.5 Create Stripe Connect step component
    - "Connect with Stripe" button
    - Status display for pending/incomplete accounts
    - Resume onboarding link for incomplete accounts
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 5. Stripe Connect integration
  - [x] 5.1 Create/update Stripe Connect edge function
    - Create Connect account with account type 'express'
    - Generate account link for onboarding
    - Return onboarding URL to frontend
    - _Requirements: 4.2, 4.4_
  
  - [x] 5.2 Create Stripe Connect webhook handler
    - Handle account.updated events
    - Update stripe_connect_status based on charges_enabled and payouts_enabled
    - Mark onboarding complete when fully verified
    - _Requirements: 4.3, 4.6_
  
  - [x] 5.3 Write property test for Stripe webhook status update
    - **Property 6: Stripe Webhook Status Update**
    - **Validates: Requirements 4.3, 4.6**

- [x] 6. Update Auth flow for Google OAuth
  - [x] 6.1 Update Auth page to handle OAuth TOS requirement
    - After Google OAuth callback, check if TOS agreed
    - If not, redirect to onboarding with TOS step
    - _Requirements: 1.2_
  
  - [x] 6.2 Update useAuth hook to track onboarding status
    - Add onboardingRequired flag
    - Trigger redirect when needed
    - _Requirements: 2.1, 2.4_

- [-] 7. Update existing seller routes
  - [x] 7.1 Wrap seller dashboard with SellerRoute
    - Apply to /dashboard, /products, /analytics routes
    - _Requirements: 1.4, 2.1_
  
  - [x] 7.2 Add "Become a Seller" trigger for non-creators
    - Add button in profile/settings to start onboarding
    - Prompt when non-creator tries to create product
    - _Requirements: 6.2, 6.3_

- [ ] 8. Checkpoint - Test full onboarding flow
  - Ensure all tests pass, ask the user if questions arise.
  - Test email signup → onboarding flow
  - Test Google OAuth → TOS → onboarding flow
  - Test Stripe Connect → webhook → completion

- [ ] 9. Final polish
  - [ ] 9.1 Add success celebration on completion
    - Confetti or animation on final step
    - Redirect to seller dashboard
    - _Requirements: 5.5_
  
  - [ ] 9.2 Add mobile responsiveness
    - Test and fix any mobile layout issues
    - _Requirements: 5.3_

## Notes

- Tasks marked with `*` are optional property-based tests
- Stripe Connect uses Express accounts for simpler seller onboarding
- TOS version should be stored as a string like "2026-01-05" for tracking
- The onboarding flow should be skippable for non-creators but required for sellers
