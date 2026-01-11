# Design Document: Multi-Page Store Builder

## Overview

This design extends the existing website builder to support multiple pages per store, with a dedicated roadmap page featuring enhanced customization. The architecture maintains backward compatibility while adding a page management layer on top of the existing section-based builder.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Store Website                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │  Home   │  │  About  │  │   TOS   │  │    Roadmap      │ │
│  │ (Store) │  │  Page   │  │  Page   │  │     Page        │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
│       │            │            │                │          │
│       └────────────┴────────────┴────────────────┘          │
│                          │                                  │
│              ┌───────────┴───────────┐                      │
│              │   Page Manager        │                      │
│              │   (website_settings)  │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### URL Structure

- `/store-name` - Main store page (marketplace)
- `/store-name/about` - About page
- `/store-name/tos` - Terms of Service page
- `/store-name/roadmap` - Roadmap page

## Components and Interfaces

### 1. Page Manager Component

```typescript
interface StorePage {
  id: string;
  type: 'home' | 'about' | 'tos' | 'roadmap';
  title: string;
  slug: string;
  sections: PageSection[];
  isEnabled: boolean;
  order: number;
}

interface PageManagerProps {
  pages: StorePage[];
  currentPage: string;
  onPageChange: (pageId: string) => void;
  onAddPage: (type: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (pages: StorePage[]) => void;
  isOwner: boolean;
}
```

### 2. Enhanced Roadmap Settings

```typescript
interface RoadmapTheme {
  name: string;
  backgroundColor: string;
  backgroundGradient?: { start: string; end: string };
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  statusColors: {
    backlog: string;
    in_progress: string;
    qa: string;
    completed: string;
  };
}

interface RoadmapSettings {
  theme: string; // preset name or 'custom'
  customTheme?: RoadmapTheme;
  showSuggestions: boolean;
  suggestionsLimit: number;
  defaultExpanded: boolean;
}
```

### 3. Preset Themes

```typescript
const ROADMAP_THEMES: Record<string, RoadmapTheme> = {
  dark: {
    name: 'Dark',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    cardBorder: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    accentColor: '#8b5cf6',
    statusColors: {
      backlog: '#64748b',
      in_progress: '#3b82f6',
      qa: '#a855f7',
      completed: '#22c55e'
    }
  },
  light: {
    name: 'Light',
    backgroundColor: '#ffffff',
    cardBackground: '#f8fafc',
    cardBorder: '#e2e8f0',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    accentColor: '#6366f1',
    statusColors: {
      backlog: '#94a3b8',
      in_progress: '#2563eb',
      qa: '#9333ea',
      completed: '#16a34a'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    backgroundColor: '#0a0a0a',
    backgroundGradient: { start: '#0a0a0a', end: '#1a0a2e' },
    cardBackground: '#1a1a2e',
    cardBorder: '#ff00ff40',
    textPrimary: '#00ffff',
    textSecondary: '#ff00ff',
    accentColor: '#ff00ff',
    statusColors: {
      backlog: '#666666',
      in_progress: '#00ffff',
      qa: '#ff00ff',
      completed: '#00ff00'
    }
  },
  ocean: {
    name: 'Ocean',
    backgroundColor: '#0c1929',
    backgroundGradient: { start: '#0c1929', end: '#1e3a5f' },
    cardBackground: '#1e3a5f',
    cardBorder: '#2563eb40',
    textPrimary: '#e0f2fe',
    textSecondary: '#7dd3fc',
    accentColor: '#0ea5e9',
    statusColors: {
      backlog: '#475569',
      in_progress: '#0ea5e9',
      qa: '#6366f1',
      completed: '#10b981'
    }
  },
  forest: {
    name: 'Forest',
    backgroundColor: '#0f1f0f',
    backgroundGradient: { start: '#0f1f0f', end: '#1a3a1a' },
    cardBackground: '#1a3a1a',
    cardBorder: '#22c55e40',
    textPrimary: '#dcfce7',
    textSecondary: '#86efac',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#4b5563',
      in_progress: '#22c55e',
      qa: '#eab308',
      completed: '#10b981'
    }
  }
};
```

## Data Models

### Extended Website Settings

```typescript
interface WebsiteSettings {
  // Existing fields...
  template: string;
  hero_title: string;
  // ...
  
  // NEW: Multi-page support
  pages: StorePage[];
  currentPageId: string;
  
  // NEW: Roadmap settings
  roadmap_settings: RoadmapSettings;
}
```

### Database Schema (Already exists, no changes needed)

The roadmap tables already exist:
- `roadmap_versions` - Version/release tracking
- `roadmap_items` - Individual tasks
- `roadmap_suggestions` - User suggestions
- `roadmap_suggestion_upvotes` - Upvote tracking

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Page Limit Enforcement
*For any* store, attempting to create more than 4 pages SHALL fail and the page count SHALL remain at 4.
**Validates: Requirements 1.1**

### Property 2: Correct Page Routing
*For any* valid store slug and page type combination, navigating to the URL SHALL render the correct page content.
**Validates: Requirements 1.4, 2.1**

### Property 3: Page Section Independence
*For any* two pages in the same store, modifying sections on one page SHALL NOT affect sections on the other page.
**Validates: Requirements 1.5**

### Property 4: Roadmap Data Display Completeness
*For any* roadmap with versions and items, the roadmap page SHALL display all versions and all items within each version.
**Validates: Requirements 2.2**

### Property 5: Suggestion Display with Upvotes
*For any* set of suggestions, they SHALL be displayed sorted by upvote count in descending order.
**Validates: Requirements 2.5, 7.5**

### Property 6: Theme Application Completeness
*For any* preset theme selection, all theme colors (background, card, text, status badges) SHALL be applied to the roadmap display.
**Validates: Requirements 3.7**

### Property 7: Reorder Persistence
*For any* reorder operation on versions or items, the new order SHALL persist after page refresh.
**Validates: Requirements 4.4, 5.4**

### Property 8: Owner-Only Edit Access
*For any* non-owner user viewing a roadmap, all edit controls (add, edit, delete, status change) SHALL be hidden AND any direct API modification attempts SHALL be rejected.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 9: Upvote Invariants
*For any* suggestion, the upvote count SHALL equal the number of unique users who have upvoted it, AND each user SHALL only be able to upvote once.
**Validates: Requirements 7.2, 7.3, 7.4**

### Property 10: Suggestion Creation Status
*For any* new suggestion created by a logged-in user, it SHALL be saved with status 'pending'.
**Validates: Requirements 7.1**

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| Page limit exceeded | Show toast "Maximum 4 pages allowed" |
| Invalid page type | Redirect to main store page |
| Unauthorized edit attempt | Return 403, show "Access denied" |
| Failed to save roadmap data | Show toast with retry option |
| Upvote on own suggestion | Allow (no restriction specified) |
| Network error during save | Queue changes, retry on reconnect |

## Testing Strategy

### Unit Tests
- Page manager component renders correct number of pages
- Theme application applies all colors correctly
- Owner detection logic works for various auth states
- URL parsing extracts correct page type

### Property-Based Tests
- Use fast-check library for TypeScript
- Minimum 100 iterations per property test
- Test page limit enforcement with random page creation attempts
- Test upvote count invariants with random upvote/remove sequences
- Test reorder persistence with random reorder operations

### Integration Tests
- Full page navigation flow
- Roadmap CRUD operations
- Suggestion submission and upvoting
- Theme switching and persistence
