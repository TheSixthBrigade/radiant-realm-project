# Requirements Document: Database Interface Redesign

## Overview

Redesign the Event Horizon database interface (`database/event-horizon-ui/`) to create a Supabase-inspired database management experience with a distinctive Swiss/International Typographic design direction. The interface should feel like a professional database tool while maintaining visual distinction from typical SaaS landing pages.

## User Stories

- As a developer, I want a database interface that feels professional and trustworthy, so that I feel confident managing my production databases
- As a database admin, I want quick access to tables, rows, and queries, so that I can efficiently manage my database operations
- As a developer, I want a query interface that feels like a real code editor, so that writing SQL feels natural and productive
- As a database admin, I want to see schema information at a glance, so that I can understand my database structure quickly
- As a developer, I want smooth transitions between different views, so that the interface feels responsive and polished

## Design Direction

### Visual Identity

**Style Language:** Swiss / International Typography
- Editorial magazine layout principles
- Brutalist structural honesty
- Modern minimalism with purpose

**Key Visual Characteristics:**
- Asymmetrical grids and layouts
- Strong typography as the primary visual element
- High contrast color system
- Sharp edges (minimal rounded corners)
- No soft gradients or glassmorphism
- Generous whitespace and clear hierarchy

### Typography System (Required)

**Font Stack:**
- Headlines: Space Grotesk
- Body: Inter
- Mono/UI accents: JetBrains Mono

**Typography Rules:**
- Large headline sizes: clamp(64px, 8vw, 120px)
- Tight letter spacing on headlines
- Generous line height on body text
- No default Tailwind font scales

### Color System

**Palette Structure:**
- 1 Primary color
- 1 Secondary color
- 1 Accent color
- 2 Neutrals (light + dark)

**Color Rules:**
- High contrast only
- No gradients unless explicitly requested
- Colors defined as CSS variables or Tailwind theme tokens

### Layout Principles

- Asymmetrical grids
- Mix of single-column and multi-column sections
- Allow overlapping elements
- Unexpected breaks between sections
- Horizontal rhythm over vertical stacking
- NO standard SaaS patterns (Hero → Features → Pricing → Testimonials → CTA)

### Component Philosophy

- Build from primitives (section, stack, cluster, grid)
- Fewer components, more composable primitives
- No pre-styled "cards"
- Borders over shadows
- Sharp edges preferred

### Interaction & Motion

- Subtle motion only
- Fast easing
- Short durations
- Motion reinforces hierarchy, never decorates

## Functional Requirements

### 1. Dashboard / Home

**Current State:** Basic project list
**Required State:**
- Project overview with statistics
- Recent activity feed
- Quick actions (new table, new query, etc.)
- Database connection status
- Storage and usage metrics

### 2. Table Browser

**Current State:** Basic table listing
**Required State:**
- Hierarchical navigation (database → schema → table)
- Table list with row counts
- Column information at a glance
- Quick filter/search
- Table actions (browse, edit schema, delete)

### 3. Data Editor

**Current State:** Basic row viewing
**Required State:**
- Spreadsheet-like data editing
- Inline editing capabilities
- Filtering and sorting controls
- Bulk operations support
- Export functionality
- Relationship navigation

### 4. SQL Editor

**Current State:** Basic query interface
**Required State:**
- Full-featured SQL editor with syntax highlighting
- Query history
- Saved queries
- Explain/analyze support
- Results pagination
- Export options

### 5. Schema Designer

**Current State:** Basic schema view
**Required State:**
- Visual schema representation
- ER diagram view
- Table relationship visualization
- Column type suggestions
- Index management

### 6. Settings

**Current State:** Basic settings
**Required State:**
- Project settings
- API key management
- Webhook configuration
- Team management
- Billing and usage

## Non-Functional Requirements

- Mobile-first responsive design
- Accessible (WCAG 2.1 AA)
- Performance: Page load < 2s
- Support for dark mode
- Keyboard shortcuts for power users

## Design Deliverables

1. **Design Tokens:** Colors, fonts, spacing, motion values
2. **Layout Description:** Grid system, section structure
3. **Component List:** Primitive components and their variants
4. **React/Tailwind Code:** Implementation of key pages

## Success Criteria

- Interface feels professional and database-focused
- Design is distinctive from typical SaaS landing pages
- Typography does most of the visual work
- Asymmetry is present throughout
- High contrast and clear hierarchy
- No soft gradients or glassmorphism
- Sharp edges throughout
- Smooth, purposeful interactions