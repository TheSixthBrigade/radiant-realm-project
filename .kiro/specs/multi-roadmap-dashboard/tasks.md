# Implementation Plan: Multi-Roadmap Dashboard

## Overview

Implement a multi-roadmap system with a stylish dashboard showing preview cards for each product roadmap, allowing users to click and view the full roadmap.

## Tasks

- [x] 1. Database schema updates
  - [x] 1.1 Create migration for product roadmap association
    - Add `product_id UUID` column to `roadmap_versions` table
    - Add `roadmap_enabled BOOLEAN DEFAULT false` to `products` table
    - Add `roadmap_settings JSONB DEFAULT '{}'` to `products` table
    - Create index on `roadmap_versions.product_id`
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Create RoadmapDashboard component
  - [x] 2.1 Create base component structure
    - Create `src/components/RoadmapDashboard.tsx`
    - Add TypeScript interfaces for ProductRoadmap
    - Implement data fetching for products with roadmap stats
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Implement dashboard layout
    - Add Kinetic-style background with floating orbs
    - Create responsive grid layout for cards
    - Add header with title and store branding
    - _Requirements: 5.1, 5.4_

- [x] 3. Create RoadmapPreviewCard component
  - [x] 3.1 Build card structure
    - Created inline in `RoadmapDashboard.tsx`
    - Add product image with gradient overlay
    - Display product name and current version badge
    - _Requirements: 1.2, 5.2, 5.3_
  - [x] 3.2 Add progress stats
    - Calculate and display task completion count
    - Add animated progress bar with percentage
    - Show version count
    - _Requirements: 1.2, 3.4_
  - [x] 3.3 Implement hover effects
    - Add scale transform on hover
    - Add glow effect on hover
    - Add border brightness increase
    - _Requirements: 5.5_

- [x] 4. Implement navigation and routing
  - [x] 4.1 Update UserSite.tsx routing
    - Handle `/roadmap` route for dashboard view
    - Handle `/roadmap/:productId` for specific roadmap
    - Add state management for selected roadmap
    - _Requirements: 4.1, 4.2_
  - [x] 4.2 Add navigation between views
    - Implement card click to view full roadmap
    - Add back button to return to dashboard
    - Handle non-existent roadmap redirect
    - _Requirements: 1.3, 4.3_

- [x] 5. Implement owner controls
  - [x] 5.1 Add roadmap management for owners
    - Show "Enable Roadmap" button for products without roadmaps
    - Add toggle to enable/disable roadmap per product
    - Show edit/delete controls on cards
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.2 Update RoadmapPage for product association
    - Pass product_id to RoadmapPage component
    - Filter versions by product_id
    - Save roadmap settings per product
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 6. Handle empty and error states
  - [x] 6.1 Implement empty state
    - Show message when no roadmaps exist
    - Add CTA for owners to create first roadmap
    - Style consistently with dashboard theme
    - _Requirements: 1.5_
  - [x] 6.2 Implement error handling
    - Handle database errors gracefully
    - Show toast for navigation errors
    - Add retry functionality
    - _Requirements: 4.3_

- [x] 7. Checkpoint - Test dashboard functionality
  - All core functionality implemented

- [ ]* 8. Property-based tests
  - [ ]* 8.1 Write property test for task count accuracy
    - **Property 2: Task Count Accuracy**
    - **Validates: Requirements 1.2**
  - [ ]* 8.2 Write property test for completion percentage
    - **Property 3: Completion Percentage Calculation**
    - **Validates: Requirements 1.2**

- [x] 9. Final checkpoint
  - Core implementation complete

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Dashboard uses same Kinetic styling as RoadmapPage for consistency
