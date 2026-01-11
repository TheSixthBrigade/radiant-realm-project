# Requirements Document

## Introduction

This document covers a comprehensive set of platform enhancements including roadmap voting, changelog generation, email notifications, product reviews, discount codes, product bundles, affiliate system, analytics dashboard, product versioning, license keys, and download tracking.

## Glossary

- **Store_Owner**: A user who has created products and has a store page
- **Buyer**: A user who has purchased a product
- **Visitor**: Any user viewing a store (logged in or not)
- **Roadmap_Item**: A task/feature on a product's roadmap
- **Vote**: An upvote on a roadmap item or suggestion
- **Changelog**: Auto-generated release notes from completed roadmap items
- **License_Key**: A unique key generated for software product purchases

## Requirements

### Requirement 1: Roadmap Voting System

**User Story:** As a store owner, I want to enable voting on roadmap items so my community can influence development priorities.

#### Acceptance Criteria

1. WHEN a store owner views their roadmap settings, THE System SHALL display a "Enable Voting" toggle
2. WHEN voting is enabled for a roadmap, THE System SHALL display vote counts and vote buttons on roadmap items
3. WHEN a logged-in user clicks the vote button, THE System SHALL increment the vote count and record the user's vote
4. WHEN a user has already voted on an item, THE System SHALL display a filled vote icon and allow them to remove their vote
5. WHEN voting is disabled by the owner, THE System SHALL hide vote buttons but may still show vote counts
6. THE System SHALL prevent users from voting multiple times on the same item
7. WHEN displaying roadmap items, THE System SHALL optionally sort by vote count (owner configurable)

### Requirement 2: Changelog/Release Notes

**User Story:** As a store owner, I want changelogs auto-generated from completed roadmap items so buyers can see what's new.

#### Acceptance Criteria

1. WHEN a version status is changed to "released", THE System SHALL auto-generate a changelog entry
2. THE Changelog SHALL include version name, release date, and all completed items with descriptions
3. WHEN viewing a product page, THE System SHALL display a "Changelog" tab showing all releases
4. THE System SHALL allow owners to edit auto-generated changelog entries before publishing
5. WHEN a changelog is published, THE System SHALL make it visible to all visitors

### Requirement 3: Email Notifications

**User Story:** As a buyer, I want to receive email notifications when products I purchased get updates.

#### Acceptance Criteria

1. WHEN a new version is released for a product, THE System SHALL send email notifications to all buyers
2. THE Email SHALL include product name, version number, changelog summary, and download link
3. WHEN a user purchases a product, THE System SHALL add them to the notification list for that product
4. THE System SHALL provide an unsubscribe link in all notification emails
5. WHEN a user unsubscribes, THE System SHALL stop sending notifications for that product
6. THE System SHALL use support@vectabase.com as the sender address

### Requirement 4: Product Reviews/Ratings

**User Story:** As a buyer, I want to leave reviews on products I purchased so other buyers can make informed decisions.

#### Acceptance Criteria

1. WHEN a user has purchased a product, THE System SHALL allow them to leave a review
2. THE Review SHALL include a 1-5 star rating and optional text comment
3. WHEN displaying product cards, THE System SHALL show average rating and review count
4. WHEN viewing a product page, THE System SHALL display all reviews with user info and date
5. THE System SHALL prevent users from reviewing products they haven't purchased
6. THE System SHALL allow users to edit or delete their own reviews
7. THE System SHALL allow store owners to respond to reviews

### Requirement 5: Discount Codes/Coupons

**User Story:** As a store owner, I want to create discount codes so I can run promotions.

#### Acceptance Criteria

1. WHEN a store owner accesses their dashboard, THE System SHALL provide a "Discount Codes" management section
2. THE System SHALL allow creating codes with: code string, discount type (percentage/fixed), amount, expiry date, usage limit
3. WHEN a buyer enters a valid code at checkout, THE System SHALL apply the discount to the total
4. WHEN a code is expired or usage limit reached, THE System SHALL reject it with appropriate message
5. THE System SHALL track code usage and display analytics to the owner
6. THE System SHALL support product-specific or store-wide codes

### Requirement 6: Product Bundles

**User Story:** As a store owner, I want to bundle multiple products at a discount so buyers get better value.

#### Acceptance Criteria

1. WHEN a store owner accesses their dashboard, THE System SHALL provide a "Bundles" management section
2. THE System SHALL allow selecting multiple products to include in a bundle
3. THE System SHALL allow setting a bundle price (typically less than sum of individual prices)
4. WHEN a buyer purchases a bundle, THE System SHALL grant access to all included products
5. WHEN displaying bundles, THE System SHALL show savings compared to individual purchases
6. THE System SHALL display bundles on the store page alongside individual products

### Requirement 7: Affiliate System

**User Story:** As a user, I want to earn commission by referring sales so I can monetize my audience.

#### Acceptance Criteria

1. WHEN a user accesses their dashboard, THE System SHALL provide an "Affiliate" section
2. THE System SHALL generate unique referral links for each user
3. WHEN a purchase is made through a referral link, THE System SHALL track the referral
4. THE System SHALL calculate commission based on store owner's configured rate (default 10%)
5. WHEN affiliate earnings reach minimum threshold, THE System SHALL allow payout requests
6. THE System SHALL provide affiliate analytics showing clicks, conversions, and earnings
7. THE Store_Owner SHALL be able to enable/disable affiliate program and set commission rate

### Requirement 8: Sales Analytics Dashboard

**User Story:** As a store owner, I want to see sales analytics so I can understand my business performance.

#### Acceptance Criteria

1. WHEN a store owner accesses their dashboard, THE System SHALL display sales analytics
2. THE Analytics SHALL include: revenue over time chart, top selling products, conversion rates
3. THE System SHALL allow filtering by date range (7 days, 30 days, 90 days, custom)
4. THE System SHALL show comparison to previous period (e.g., +15% vs last month)
5. THE System SHALL display total revenue, total orders, average order value

### Requirement 9: Customer Insights

**User Story:** As a store owner, I want to see customer data so I can understand my audience.

#### Acceptance Criteria

1. WHEN viewing analytics, THE System SHALL display customer insights section
2. THE Insights SHALL include: total customers, repeat customers, new vs returning
3. THE System SHALL show geographic distribution of customers (by country)
4. THE System SHALL list top customers by total spend
5. THE System SHALL respect privacy by not exposing sensitive customer data

### Requirement 10: Product Versioning

**User Story:** As a store owner, I want to upload new versions of my products so buyers get updates.

#### Acceptance Criteria

1. WHEN editing a product, THE System SHALL allow uploading new versions
2. THE System SHALL maintain version history with version number, date, and changelog
3. WHEN a buyer accesses their downloads, THE System SHALL show the latest version
4. THE System SHALL allow buyers to download previous versions if needed
5. THE System SHALL notify buyers of new versions (via email notifications - Req 3)

### Requirement 11: License Key System

**User Story:** As a store owner, I want auto-generated license keys for my software products.

#### Acceptance Criteria

1. WHEN creating/editing a product, THE System SHALL allow enabling license key generation
2. WHEN a purchase is completed for a license-enabled product, THE System SHALL generate a unique key
3. THE License_Key SHALL be displayed to the buyer on purchase confirmation and in their downloads
4. THE System SHALL provide an API endpoint for sellers to verify license keys
5. THE System SHALL allow owners to revoke or regenerate license keys
6. THE System SHALL track license key activations if configured

### Requirement 12: Download Tracking

**User Story:** As a store owner, I want to see download statistics for my products.

#### Acceptance Criteria

1. WHEN a buyer downloads a product, THE System SHALL record the download event
2. THE System SHALL track: download count, unique downloaders, download by version
3. WHEN viewing product analytics, THE System SHALL display download statistics
4. THE System SHALL show download trends over time
5. THE System SHALL distinguish between first downloads and re-downloads
