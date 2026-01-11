# Design Document: Site Header Navigation

## Overview

This feature adds a customizable site-wide header/navigation bar that displays across all pages of a creator's site. The header allows creators to show their logo, site name, and navigation links to different pages (store, community, roadmap, etc.) as well as custom external links.

## Architecture

The site header will be implemented as:
1. A new `SiteHeader` component that renders the navigation bar
2. Header settings stored in `website_settings.header_config` in the profiles table
3. Integration into `UserSite.tsx` to render the header on all page types
4. A header configuration panel in the PageBuilderSidebar for creators to customize

```
┌─────────────────────────────────────────────────────────────┐
│                      UserSite.tsx                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   SiteHeader                          │  │
│  │  [Logo] [Site Name]     [Store] [Community] [Roadmap] │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Page Content (varies by route)           │  │
│  │         (Store / Community / Roadmap / etc.)          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### SiteHeader Component

```typescript
interface NavLink {
  id: string;
  label: string;
  type: 'page' | 'external';
  pageSlug?: string;      // For internal page links
  externalUrl?: string;   // For external links
  openInNewTab?: boolean; // For external links
  order: number;
}

interface HeaderConfig {
  enabled: boolean;
  logoUrl?: string;
  siteName?: string;
  showSiteName: boolean;
  backgroundColor: string;
  textColor: string;
  isTransparent: boolean;
  isSticky: boolean;
  navLinks: NavLink[];
  accentColor: string;
}

interface SiteHeaderProps {
  config: HeaderConfig;
  currentPageSlug: string;
  baseUrl: string;  // e.g., /site/john
  storeName: string;
  isOwner: boolean;
}
```

### Header Configuration Panel

Added to PageBuilderSidebar as a new tab/section for header settings:
- Toggle header on/off
- Upload logo image
- Set site name
- Configure navigation links (add/remove/reorder)
- Style settings (colors, transparency, sticky)

## Data Models

### Header Config in website_settings

```typescript
// Stored in profiles.website_settings.header_config
{
  header_config: {
    enabled: true,
    logoUrl: "https://...",
    siteName: "My Store",
    showSiteName: true,
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    isTransparent: false,
    isSticky: true,
    accentColor: "#14b8a6",
    navLinks: [
      { id: "1", label: "Store", type: "page", pageSlug: "", order: 0 },
      { id: "2", label: "Community", type: "page", pageSlug: "community", order: 1 },
      { id: "3", label: "Roadmap", type: "page", pageSlug: "roadmap", order: 2 },
      { id: "4", label: "Discord", type: "external", externalUrl: "https://discord.gg/...", openInNewTab: true, order: 3 }
    ]
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

Based on the acceptance criteria analysis:

**Property 1: Header visibility consistency**
*For any* creator site with header enabled, the header SHALL be visible on all page types (store, community, roadmap, etc.)
**Validates: Requirements 1.1**

**Property 2: Navigation link functionality**
*For any* navigation link clicked, the system SHALL navigate to the correct destination (internal page or external URL)
**Validates: Requirements 1.4**

**Property 3: Settings persistence**
*For any* header configuration saved by a creator, loading the site SHALL display the same configuration
**Validates: Requirements 4.1, 4.2**

**Property 4: Mobile responsiveness**
*For any* viewport width below 768px, the header SHALL display a hamburger menu instead of inline links
**Validates: Requirements 3.1, 3.2**

## Error Handling

1. **Missing logo**: If logoUrl is invalid or fails to load, fall back to displaying siteName
2. **Invalid page links**: If a page link references a disabled/deleted page, hide that link
3. **No settings**: If header_config doesn't exist, use sensible defaults (header enabled with auto-generated page links)

## Testing Strategy

### Unit Tests
- Test NavLink rendering for different link types
- Test mobile menu toggle behavior
- Test active link highlighting based on current page

### Property Tests
- **Property 1**: Generate random header configs and verify header renders on all page types
- **Property 2**: Generate random nav links and verify click handlers navigate correctly
- **Property 3**: Generate random configs, save, reload, and verify equality

### Integration Tests
- Test header persistence through save/reload cycle
- Test header display across page navigation
