# Implementation Plan: Site Header Navigation

## Overview

Implement a customizable site-wide header/navigation bar for creator sites with logo, site name, and navigation links to pages and external URLs.

## Tasks

- [x] 1. Create SiteHeader component
  - [x] 1.1 Create `src/components/SiteHeader.tsx` with TypeScript interfaces
    - Define NavLink, HeaderConfig, and SiteHeaderProps interfaces
    - Implement basic header layout with logo/site name and nav links
    - Add active link highlighting based on current page
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Add mobile responsive hamburger menu
    - Implement hamburger icon toggle for mobile viewports
    - Create slide-out/dropdown menu for mobile navigation
    - Add smooth transitions for menu open/close
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Integrate SiteHeader into UserSite.tsx
  - [x] 2.1 Add header config state and loading from website_settings
    - Load header_config from website_settings
    - Set up default config if none exists
    - _Requirements: 4.2, 4.3_

  - [x] 2.2 Render SiteHeader on all page types
    - Add SiteHeader above page content for all routes
    - Pass current page slug for active link highlighting
    - _Requirements: 1.1_

- [x] 3. Create Header Configuration UI
  - [x] 3.1 Add HeaderConfigPanel component to PageBuilderSidebar
    - Create new panel/tab for header settings
    - Add toggle for header visibility
    - Add logo upload with preview
    - Add site name input
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Implement navigation link management
    - Add UI to select which pages appear in nav
    - Add drag-to-reorder functionality for links
    - Add external link creation (label, URL, new tab toggle)
    - _Requirements: 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4_

  - [x] 3.3 Add header style settings
    - Background color picker
    - Text color picker
    - Transparent/sticky toggles
    - Accent color for active states
    - _Requirements: 1.5_

- [x] 4. Implement header settings persistence
  - [x] 4.1 Save header config to website_settings
    - Update handleSave in UserSite.tsx to include header_config
    - _Requirements: 4.1_

- [x] 5. Checkpoint - Test header functionality
  - Ensure header displays on all pages
  - Verify navigation links work correctly
  - Test mobile menu functionality
  - Verify settings save and load correctly

## Notes

- Header config stored in `profiles.website_settings.header_config`
- Default behavior: header enabled with auto-generated links to enabled pages
- External links open in new tab by default
- Mobile breakpoint at 768px (md in Tailwind)
