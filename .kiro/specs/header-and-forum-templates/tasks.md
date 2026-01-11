# Implementation Plan: Header and Forum Templates

## Overview

This implementation adds extensive header customization with 8 pre-built templates, 8 navigation styles, visual effects, typography controls, and 6 forum layout templates. The work is organized into phases: header templates first, then forum templates, with UI controls throughout.

## Tasks

- [ ] 1. Create header template system and extended config
  - [ ] 1.1 Create headerTemplates.ts with template definitions and extended HeaderConfig interface
    - Define HEADER_TEMPLATES array with 8 templates (Minimal, Modern, Glassmorphism, Neon, Corporate, Gaming, Elegant, Bold)
    - Extend HeaderConfig interface with all new styling properties
    - Export helper functions for template application
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [ ] 1.2 Update SiteHeader.tsx to support all new styling options
    - Add support for 8 nav styles (default, pills, underline, buttons, gradient, ghost, outlined, floating)
    - Implement background effects (solid, gradient, glassmorphism, blur)
    - Add border styles (none, solid, gradient, glow)
    - Add shadow styles (none, subtle, medium, strong, colored)
    - Implement hover effects (none, glow, lift, scale, color-shift)
    - Add typography controls (font weight, size, letter spacing, text transform)
    - Implement split navigation layout
    - Add animated gradient support
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 1.3 Write property test for template application preserving nav links
    - **Property 1: Template Application Preserves Navigation Links**
    - **Validates: Requirements 1.2, 1.4**

- [ ] 2. Implement header icon system
  - [ ] 2.1 Expand icon library in SiteHeader.tsx
    - Add 28+ icons to NAV_ICONS mapping
    - Implement icon position options (before, after, icon-only)
    - Add icon size options (small, normal, medium, large)
    - Add individual showIcon toggle per NavLink
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Write property test for individual icon toggle independence
    - **Property 5: Individual Icon Toggle Independence**
    - **Validates: Requirements 6.1**

- [ ] 3. Create header customization UI in PageBuilderSidebar
  - [ ] 3.1 Add header template selector with visual previews
    - Create template grid with preview thumbnails
    - Implement one-click template application
    - Show template name and description on hover
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Add navigation style controls
    - Add nav style dropdown (8 options)
    - Add button border radius slider (0-50px)
    - Add button padding selector
    - Add hover effect selector
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.3 Add layout controls
    - Add logo position selector
    - Add nav position selector (including split option)
    - Add header height selector
    - Add layout mode toggle (full-width/contained)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.4 Add visual effects controls
    - Add background effect selector
    - Add gradient color pickers and direction
    - Add animated gradient toggle and speed
    - Add border style selector
    - Add shadow style selector
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.5 Add typography controls
    - Add font weight selector
    - Add font size selector
    - Add letter spacing selector
    - Add text transform selector
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 3.6 Add icon controls
    - Add global show icons toggle
    - Add icon position selector
    - Add icon size selector
    - Add per-link icon selector with 28+ options
    - Add per-link showIcon toggle
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Checkpoint - Header customization complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create forum template system
  - [ ] 5.1 Create forumTemplates.ts with template definitions and ForumConfig interface
    - Define FORUM_TEMPLATES array with 6 templates (Classic, Modern Card, Compact List, Discord, Reddit, Minimal)
    - Define ForumConfig interface with all styling properties
    - Export helper functions for template application
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 5.2 Update CommunityForums.tsx to support ForumConfig
    - Add forumConfig prop
    - Implement layout variations (classic, modern-card, compact-list, discord, reddit, minimal)
    - Add post card styles (flat, raised, bordered, glassmorphism)
    - Add category pill styles (rounded, square, tag)
    - Add avatar styles (circle, rounded-square, square)
    - Add spacing options (compact, normal, relaxed)
    - Implement customizable forum header (title, subtitle, background, height)
    - _Requirements: 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 5.3 Write property test for forum template preserving data
    - **Property 2: Forum Template Application Preserves Data**
    - **Validates: Requirements 7.3, 7.4**

- [ ] 6. Create forum customization UI in PageBuilderSidebar
  - [ ] 6.1 Add forum template selector with visual previews
    - Create template grid with preview thumbnails
    - Implement one-click template application
    - _Requirements: 7.1, 7.2_

  - [ ] 6.2 Add forum visual controls
    - Add post card style selector
    - Add category pill style selector
    - Add avatar style selector
    - Add post spacing selector
    - Add accent color picker
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 6.3 Add forum header controls
    - Add title input
    - Add subtitle input
    - Add header background selector
    - Add header height selector
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 7. Implement responsive behavior
  - [ ] 7.1 Add mobile menu style options to header
    - Implement slide-in menu style
    - Implement dropdown menu style
    - Implement fullscreen menu style
    - Add mobile menu style selector in UI
    - _Requirements: 10.1, 10.2_

  - [ ] 7.2 Ensure forum mobile responsiveness
    - Adapt all forum layouts for mobile
    - Ensure touch-friendly tap targets (44px minimum)
    - _Requirements: 10.3, 10.4_

  - [ ]* 7.3 Write property test for mobile touch target sizes
    - **Property 7: Mobile Touch Target Size**
    - **Validates: Requirements 10.4**

- [ ] 8. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Header templates should be implemented first as they're more visible
- Forum templates build on the same pattern established by header templates
- All configs are stored in the existing stores.page_builder_settings JSONB column
