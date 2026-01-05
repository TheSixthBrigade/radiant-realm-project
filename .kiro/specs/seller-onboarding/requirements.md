# Requirements Document

## Introduction

A comprehensive seller onboarding flow for Vectabase that ensures all new sellers (whether signing up via email or Google OAuth) complete required steps before they can sell: agreeing to Terms of Service, providing business information, and connecting their Stripe account for payouts.

## Glossary

- **Seller**: A user who wants to sell digital products on Vectabase
- **Onboarding_Flow**: The multi-step process new sellers must complete
- **TOS_Agreement**: User's acceptance of Terms of Service
- **Business_Profile**: Seller's business information (name, description, etc.)
- **Stripe_Connect**: Stripe's platform for marketplace payouts to sellers
- **Onboarding_Status**: Tracks completion state (pending, in_progress, completed)

## Requirements

### Requirement 1: TOS Agreement Enforcement

**User Story:** As a platform operator, I want all users to agree to the Terms of Service before accessing seller features, so that I have legal protection and users understand the rules.

#### Acceptance Criteria

1. WHEN a user signs up via email THEN THE System SHALL require TOS checkbox agreement before account creation
2. WHEN a user signs up via Google OAuth THEN THE System SHALL redirect them to a TOS agreement page before allowing access to seller features
3. THE System SHALL store the TOS agreement timestamp and version in the user's profile
4. WHEN a user has not agreed to TOS THEN THE System SHALL block access to seller dashboard and product creation
5. IF a user attempts to access seller features without TOS agreement THEN THE System SHALL redirect them to the TOS agreement page

### Requirement 2: Onboarding Flow Detection

**User Story:** As a new seller, I want to be automatically guided through the onboarding process, so that I can start selling quickly without confusion.

#### Acceptance Criteria

1. WHEN a user with incomplete onboarding logs in THEN THE System SHALL redirect them to the onboarding flow
2. THE System SHALL track onboarding completion status with steps: tos_agreed, profile_completed, stripe_connected
3. WHEN checking onboarding status THEN THE System SHALL verify all required steps are completed
4. THE System SHALL allow users to resume onboarding from where they left off
5. WHEN all onboarding steps are complete THEN THE System SHALL mark the user as fully onboarded

### Requirement 3: Business Profile Collection

**User Story:** As a seller, I want to provide my business information during onboarding, so that buyers can trust my store and I can receive proper payouts.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL collect business/store name (required)
2. THE Onboarding_Flow SHALL collect business description (optional, max 500 chars)
3. THE Onboarding_Flow SHALL collect profile avatar/logo (optional)
4. THE Onboarding_Flow SHALL collect contact email for business inquiries (defaults to account email)
5. WHEN business profile is submitted THEN THE System SHALL validate required fields before proceeding
6. IF validation fails THEN THE System SHALL display specific error messages for each invalid field

### Requirement 4: Stripe Connect Integration

**User Story:** As a seller, I want to connect my Stripe account during onboarding, so that I can receive payouts for my sales.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL display Stripe Connect onboarding as the final step
2. WHEN user clicks "Connect Stripe" THEN THE System SHALL create a Stripe Connect account and redirect to Stripe's onboarding
3. WHEN Stripe onboarding completes THEN THE System SHALL receive webhook confirmation and update user status
4. THE System SHALL store stripe_connect_account_id and stripe_connect_status in the profile
5. IF Stripe onboarding is incomplete THEN THE System SHALL allow user to resume Stripe onboarding
6. WHEN Stripe account is fully verified THEN THE System SHALL mark stripe_connected step as complete

### Requirement 5: Onboarding UI/UX

**User Story:** As a new seller, I want a clear and visually appealing onboarding experience, so that I feel confident about the platform.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL display a progress indicator showing current step and remaining steps
2. THE Onboarding_Flow SHALL use the existing dark theme and glass card styling
3. WHEN on mobile devices THEN THE Onboarding_Flow SHALL be fully responsive
4. THE Onboarding_Flow SHALL provide clear "Next" and "Back" navigation between steps
5. WHEN user completes onboarding THEN THE System SHALL display a success message and redirect to seller dashboard

### Requirement 6: Skip/Defer Options

**User Story:** As a user who just wants to browse, I want to skip seller onboarding if I'm not ready to sell yet, so that I can explore the platform first.

#### Acceptance Criteria

1. WHEN a user signs up without selecting "become a creator" THEN THE System SHALL not require seller onboarding
2. THE System SHALL allow users to trigger seller onboarding later from their profile/settings
3. WHEN a non-seller user tries to create a product THEN THE System SHALL prompt them to complete seller onboarding first
