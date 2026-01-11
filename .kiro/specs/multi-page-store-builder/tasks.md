# Implementation Plan: Multi-Page Store Builder

## Overview

This implementation adds multi-page support to the store builder with a dedicated, customizable roadmap page. We'll build incrementally, starting with the page management system, then the roadmap page, and finally the enhanced editor.

## Tasks

- [x] 1. Create Page Management System
  - [x] 1.1 Create PageManager component for switching between store pages
    - Add page tabs/navigation in the editor sidebar
    - Support add/delete/reorder pages
    - Limit to 4 pages maximum
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Update website_settings schema to support multiple pages
    - Add `pages` array to store page configurations
    - Each page has: id, type, title, slug, sections, isEnabled
    - _Requirements: 1.5_
  
  - [x] 1.3 Update UserSite.tsx to handle page routing
    - Parse URL for page type (e.g., /store-name/roadmap)
    - Load correct page sections based on route
    - _Requirements: 1.4, 2.1_

- [x] 2. Checkpoint - Ensure page routing works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create Dedicated Roadmap Page Component
  - [x] 3.1 Create RoadmapPage.tsx as a full-page component
    - Separate from RoadmapSection (which is for embedding)
    - Full-width layout with proper spacing
    - _Requirements: 2.1, 2.2_
  
  - [x] 3.2 Implement roadmap theme system
    - Create ROADMAP_THEMES constant with 6 presets (dark, light, cyberpunk, ocean, forest, sunset)
    - Apply theme colors to all roadmap elements
    - _Requirements: 3.6, 3.7_
  
  - [x] 3.3 Add theme-aware version cards
    - Version header with status badge
    - Expandable item list
    - Theme-colored backgrounds and borders
    - _Requirements: 2.2, 3.3, 3.4_
  
  - [x] 3.4 Add theme-aware task items
    - Status icon with theme color
    - Title and description with theme text colors
    - Status badge with theme status colors
    - _Requirements: 3.2, 3.4_

- [x] 4. Checkpoint - Ensure roadmap page renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create Roadmap Editor in PageBuilderSidebar
  - [x] 5.1 Add roadmap settings section to sidebar
    - Theme selector dropdown
    - Title/subtitle inputs
    - Show/hide suggestions toggle
    - Default expanded toggle
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.2 Add version management UI (in RoadmapPage component)
    - Add version button with name input
    - Edit version status dropdown
    - Delete version with confirmation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 5.3 Add item management UI (in RoadmapPage component)
    - Add item button within each version
    - Edit item status dropdown
    - Delete item button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Checkpoint - Ensure editor controls work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Owner-Only Access Controls
  - [x] 7.1 Hide edit controls for non-owners
    - Conditionally render edit buttons based on isOwner
    - Hide status dropdowns for non-owners
    - Hide delete buttons for non-owners
    - _Requirements: 6.1, 6.3_
  
  - [x] 7.2 Verify RLS policies are enforced
    - Database already has RLS from previous migration
    - _Requirements: 6.2, 6.4_

- [x] 8. Enhance Suggestion System
  - [x] 8.1 Suggestion management in RoadmapPage
    - Upvote/downvote functionality
    - User upvote state tracking
    - _Requirements: 7.6_
  
  - [x] 8.2 Improve suggestion display
    - Sort by upvote count descending
    - Show user's upvote state
    - Animate upvote button
    - _Requirements: 7.5, 2.5_

- [ ] 9. Add Navigation Links
  - [ ] 9.1 Auto-generate navigation links for enabled pages
    - Update header section to show page links
    - Highlight current page in navigation
    - _Requirements: 1.6_
  
  - [ ] 9.2 Add page navigation to store header
    - Show links to About, TOS, Roadmap when enabled
    - Style links according to store theme
    - _Requirements: 1.6_

- [ ] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify multi-page navigation works end-to-end
  - Verify roadmap theming applies correctly
  - Verify owner-only editing is enforced

## Notes

- The roadmap database tables already exist from previous migration
- RoadmapSection.tsx exists for embedding in regular pages
- RoadmapPage.tsx is the full-page dedicated roadmap with theme support
- PageManager.tsx handles multi-page navigation in the sidebar
- PageBuilderSidebar.tsx updated with roadmap settings editor
