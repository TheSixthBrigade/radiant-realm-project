# Implementation Plan: Database Interface Redesign

## Overview

Redesign the Event Horizon database interface with a Supabase-inspired, Swiss/International Typographic design. Implementation proceeds from foundational design tokens and layout primitives to individual page components.

## Tasks

- [ ] 1. Design System Foundation
  - [ ] 1.1 Update `globals.css` with design tokens
    - Define CSS custom properties for colors, typography, spacing, borders, motion
    - Import Space Grotesk, Inter, and JetBrains Mono fonts
    - Set base styles and reset
    - Create Tailwind component classes
    - _Design: Section 4.1_

  - [ ] 1.2 Create layout primitives
    - Create `Section` component (flush, padded, wide variants)
    - Create `Stack` component (tight, normal, loose variants)
    - Create `Cluster` component (wrap, nowrap variants)
    - Create `Grid` component (12-column system)
    - _Design: Section 2.1, 3.1_

  - [ ] 1.3 Create navigation components
    - Create `Sidebar` component with navigation items
    - Create `NavItem` component (active, disabled, has-children variants)
    - Create `NavGroup` component (collapsible sections)
    - Create `Breadcrumb` component
    - _Design: Section 3.2, 4.2_

- [ ] 2. Core UI Components
  - [ ] 2.1 Create form components
    - Create `Button` component (primary, secondary, ghost, danger variants)
    - Create `Input` component (default, search, mono variants)
    - Create `Select` component
    - Create `Checkbox` and `Toggle` components
    - _Design: Section 3.4, 4.1_

  - [ ] 2.2 Create data display components
    - Create `DataTable` component with sorting, pagination
    - Create `TableHeader` and `TableCell` components
    - Create `StatCard` component
    - Create `EmptyState` component
    - Create `Badge` component (default, success, warning, error variants)
    - _Design: Section 3.3, 4.2_

  - [ ] 2.3 Create feedback components
    - Create `Toast` component (success, error, warning, info variants)
    - Create `Modal` component (default, wide, fullscreen variants)
    - Create `Alert` component
    - _Design: Section 3.5_

- [ ] 3. Page Implementations
  - [ ] 3.1 Update Dashboard page
    - Implement asymmetrical hero section with large typography
    - Implement 4-column stats grid
    - Implement recent activity list
    - Implement quick actions panel
    - _Design: Section 4.2, Dashboard_

  - [ ] 3.2 Update Table Browser page
    - Implement schema/table tree sidebar
    - Implement data table with inline editing
    - Implement toolbar with filter/search
    - Implement pagination
    - _Design: Section 4.2, DataTable_

  - [ ] 3.3 Update SQL Editor page
    - Implement code editor with syntax highlighting
    - Implement query results display
    - Implement query history panel
    - Implement saved queries functionality
    - _Design: Section 4.2, SQLEditor_

  - [ ] 3.4 Update Schema Designer page
    - Implement ER diagram visualization
    - Implement table relationship display
    - Implement column management interface
    - _Design: Section 4.2_

  - [ ] 3.5 Update Settings pages
    - Implement project settings
    - Implement API key management
    - Implement team management
    - _Design: Section 3.2_

- [ ] 4. Polish & Refinement
  - [ ] 4.1 Add micro-interactions
    - Button hover/focus states
    - Table row hover effects
    - Sidebar transitions
    - Toast animations
    - _Design: Section 8_

  - [ ] 4.2 Ensure responsive design
    - Mobile sidebar (collapsible)
    - Responsive table layouts
    - Touch-friendly interactions
    - _Design: Section 2.1_

  - [ ] 4.3 Accessibility improvements
    - Focus indicators
    - ARIA labels
    - Keyboard navigation
    - Screen reader support

- [ ] 5. Testing & Validation
  - [ ] 5.1 Cross-browser testing
    - Chrome, Firefox, Safari, Edge
    - Mobile browsers

  - [ ] 5.2 Performance testing
    - Table rendering performance
    - Page load times
    - Animation smoothness

  - [ ] 5.3 Design validation
    - Verify no SaaS landing page patterns
    - Verify asymmetry in layouts
    - Verify typography dominance
    - Verify high contrast

## Notes

- All components use sharp edges (border-radius: 0)
- Typography uses Space Grotesk for headings, Inter for body, JetBrains Mono for code
- Color palette: Primary (Orange), Secondary (Navy), Accent (Blue)
- Grid system: 12-column with asymmetric spans
- Motion: Fast easing, short durations
- No gradients, no glassmorphism, no soft shadows
- Borders over shadows for component definition