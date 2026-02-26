# Requirements Document

## Introduction

This document covers two features for the Vectabase creator platform: fixing analytics data accuracy and change-indicator logic in the Dashboard and StoreAnalytics pages, and polishing the store builder into a Payhip-quality self-contained editing experience.

## Glossary

- **Dashboard**: The `Dashboard.tsx` page showing creator stats cards
- **StoreAnalytics**: The `StoreAnalytics.tsx` page with detailed revenue charts
- **useCreatorStats**: The React hook that fetches and computes creator metrics from Supabase
- **safeRevenueChange**: Pure function that computes period-over-period revenue change without NaN/Infinity
- **UserSite**: The `UserSite.tsx` store builder component
- **PageBuilderSidebar**: The left-panel sidebar for editing store sections and pages
- **StoreStyleEditor**: The style/theme editor modal within the store builder
- **PageSection**: A typed unit of store content (hero, product grid, footer, etc.)
- **StoreTemplate**: A pre-built theme with default sections and style settings
- **WebsiteSettings**: The JSONB blob stored in `profiles.website_settings` in Supabase

---

## Requirements

### Requirement 1: Safe Revenue Change Calculation

**User Story:** As a seller, I want my revenue change percentage to display accurately, so that I am not misled by a false negative indicator when I have no sales history.

#### Acceptance Criteria

1. WHEN `previousPeriodRevenue` is 0 and `currentPeriodRevenue` is 0, THE `safeRevenueChange` function SHALL return 0
2. WHEN `previousPeriodRevenue` is 0 and `currentPeriodRevenue` is greater than 0, THE `safeRevenueChange` function SHALL return 100
3. WHEN `previousPeriodRevenue` is greater than 0, THE `safeRevenueChange` function SHALL return the correct percentage change using `((current - previous) / previous) * 100`
4. THE `safeRevenueChange` function SHALL never return `NaN` or `Infinity` for any numeric inputs
5. WHEN `previousPeriodRevenue` is 0, THE Dashboard SHALL NOT render a change badge on the revenue stat card

### Requirement 2: Creator Stats Hook Accuracy

**User Story:** As a seller, I want my dashboard stats to reflect real sales data, so that I can make informed decisions about my store.

#### Acceptance Criteria

1. THE `useCreatorStats` hook SHALL query the `sales` table filtered by `seller_id = user.id`
2. THE `useCreatorStats` hook SHALL return `previousMonthRevenue` as the sum of `sales.amount` for the 30-day period prior to the current 30-day window
3. WHEN the Supabase realtime channel emits an INSERT on `sales`, THE `useCreatorStats` hook SHALL refetch and recompute all stats
4. WHEN the Supabase realtime channel emits an UPDATE on `products`, THE `useCreatorStats` hook SHALL refetch and recompute all stats
5. IF a network error occurs during fetch, THE Dashboard SHALL display a toast error message to the user

### Requirement 3: Supabase Type Safety for Sales Table

**User Story:** As a developer, I want the `sales` table to be properly typed in the Supabase client, so that queries are type-safe and maintainable.

#### Acceptance Criteria

1. THE `StoreAnalytics` page SHALL query the `sales` table without using `(supabase as any)` casts
2. THE Supabase types file SHALL include a typed definition for the `sales` table matching the schema (`id`, `product_id`, `buyer_id`, `seller_id`, `amount`, `currency`, `stripe_payment_id`, `created_at`)

### Requirement 4: Store Builder Split-Pane Editor

**User Story:** As a seller, I want a split-pane editor with a live preview, so that I can see my changes in real time while editing.

#### Acceptance Criteria

1. THE `UserSite` component SHALL render a left sidebar panel (`PageBuilderSidebar`) and a right live-preview panel simultaneously when in edit mode
2. WHEN a seller changes any section or style setting, THE live preview SHALL update immediately without a full page reload
3. THE editor toolbar SHALL include a mobile/tablet/desktop preview toggle
4. WHEN the mobile preview mode is selected, THE preview panel SHALL constrain its width to 375px
5. WHEN the tablet preview mode is selected, THE preview panel SHALL constrain its width to 768px

### Requirement 5: Template Picker

**User Story:** As a seller, I want to choose from pre-built store templates, so that I can set up a professional-looking store quickly.

#### Acceptance Criteria

1. WHEN a seller opens the store builder with no saved sections, THE `UserSite` component SHALL display a template picker
2. THE template picker SHALL offer at least 6 built-in templates (Dark Violet, Midnight Blue, Minimal Light, Neon Green, Crimson, Forest)
3. WHEN a seller selects a template, THE `UserSite` component SHALL apply the template's `settings` and `defaultSections` to the current store state
4. WHEN a template is applied, THE `UserSite` component SHALL NOT overwrite any sections or settings the seller has already customised

### Requirement 6: PageBuilderSidebar Tab Structure

**User Story:** As a seller, I want the sidebar organised into clear tabs, so that I can find editing controls without cognitive overload.

#### Acceptance Criteria

1. THE `PageBuilderSidebar` SHALL be organised into four tabs: Pages, Sections, Style, and Settings
2. WHEN the Pages tab is active, THE sidebar SHALL display controls to add, remove, and reorder store pages
3. WHEN the Sections tab is active, THE sidebar SHALL display the section list with drag handles and an Add Section button
4. WHEN the Style tab is active, THE sidebar SHALL display quick style controls for colors, fonts, and background
5. WHEN the Settings tab is active, THE sidebar SHALL display controls for store name, SEO metadata, and social links

### Requirement 7: Section Renderers — Full Implementation

**User Story:** As a seller, I want all section types to render correctly, so that my store looks complete and professional.

#### Acceptance Criteria

1. THE store builder SHALL fully render all section types: `hero`, `slideshow`, `product_grid`, `featured_products`, `testimonials`, `newsletter`, `contact_us`, `text`, `image`, `image_with_text`, `footer`, `collections`
2. WHEN a `product_grid` section is rendered with no products, THE section SHALL display a "Add your first product" call-to-action
3. WHEN a `contact_us` section form is submitted, THE system SHALL accept the submission and provide user feedback
4. IF a `contact_us` form submission is made within 60 seconds of a previous submission from the same session, THE system SHALL reject it and display a rate-limit message
5. WHEN a seller is not connected to Stripe, THE buy buttons in product sections SHALL be disabled and display a tooltip explaining the requirement

### Requirement 8: Drag-and-Drop Section Reordering

**User Story:** As a seller, I want to reorder sections by dragging them, so that I can arrange my store layout intuitively.

#### Acceptance Criteria

1. THE `PageBuilderSidebar` Sections tab SHALL support drag-and-drop reordering of sections using `@dnd-kit/sortable`
2. WHEN sections are reordered, THE `reorderSections` function SHALL preserve all section IDs and produce a valid ordering with the same number of sections
3. WHEN sections are reordered, THE live preview SHALL update to reflect the new order immediately

### Requirement 9: Save and Publish Flow

**User Story:** As a seller, I want a clear save flow with feedback, so that I know my changes have been persisted.

#### Acceptance Criteria

1. WHEN a seller clicks Save, THE `UserSite` component SHALL update `profiles.website_settings` in Supabase
2. WHEN the save succeeds, THE system SHALL display a "Saved!" toast notification
3. IF the save fails due to a network error, THE system SHALL display an error toast and retain the unsaved state
4. THE save action SHALL only execute when `isOwner` is `true`

### Requirement 10: All Store Pages Functional

**User Story:** As a seller, I want all store pages (Home, About, Roadmap, Community, TOS) to be editable and renderable, so that my store is complete.

#### Acceptance Criteria

1. THE store builder SHALL support editing and rendering of five page types: Home, About, Roadmap, Community, and TOS
2. WHEN a seller navigates to a page in the builder, THE sidebar SHALL display the sections and settings relevant to that page
3. WHERE a page type is gated as a Pro feature, THE system SHALL display a lock icon and an upgrade prompt instead of the editor controls
