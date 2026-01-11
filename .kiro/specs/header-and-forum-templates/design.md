# Design Document: Header and Forum Templates

## Overview

This design provides extensive customization capabilities for site headers and community forums through a template-based system with granular control options. The implementation extends the existing `SiteHeader` and `CommunityForums` components with new configuration interfaces and pre-built templates.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PageBuilderSidebar                           │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Header Templates   │  │  Forum Templates                │  │
│  │  - Template Grid    │  │  - Template Grid                │  │
│  │  - Style Controls   │  │  - Layout Controls              │  │
│  │  - Typography       │  │  - Visual Controls              │  │
│  │  - Effects          │  │  - Header Settings              │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────────┐
        │    SiteHeader     │       │   CommunityForums     │
        │  - HeaderConfig   │       │   - ForumConfig       │
        │  - NavLink[]      │       │   - ForumTemplate     │
        │  - Template       │       │   - Posts/Categories  │
        └───────────────────┘       └───────────────────────┘
```

## Components and Interfaces

### Extended HeaderConfig Interface

```typescript
interface HeaderConfig {
  // Existing fields
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
  
  // Template selection
  templateId?: string;
  
  // Navigation styles
  navStyle: 'default' | 'pills' | 'underline' | 'buttons' | 'gradient' | 'ghost' | 'outlined' | 'floating';
  navPosition: 'left' | 'center' | 'right' | 'split';
  
  // Button styling
  buttonBorderRadius: number; // 0-50
  buttonPadding: 'compact' | 'normal' | 'relaxed' | 'spacious';
  hoverEffect: 'none' | 'glow' | 'lift' | 'scale' | 'color-shift';
  
  // Layout
  logoPosition: 'left' | 'center' | 'right';
  headerHeight: 'compact' | 'normal' | 'tall' | 'extra-tall';
  layoutMode: 'full-width' | 'contained';
  
  // Visual effects
  backgroundEffect: 'solid' | 'gradient' | 'glassmorphism' | 'blur';
  gradientColors?: [string, string];
  gradientDirection?: string;
  animatedGradient?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  
  // Borders and shadows
  borderStyle: 'none' | 'solid' | 'gradient' | 'glow';
  borderColor?: string;
  shadowStyle: 'none' | 'subtle' | 'medium' | 'strong' | 'colored';
  shadowColor?: string;
  
  // Typography
  fontWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  fontSize: 'small' | 'normal' | 'medium' | 'large';
  letterSpacing: 'tight' | 'normal' | 'wide' | 'extra-wide';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  
  // Icons
  showIcons: boolean;
  iconPosition: 'before' | 'after' | 'only';
  iconSize: 'small' | 'normal' | 'medium' | 'large';
  
  // Mobile
  mobileMenuStyle: 'slide-in' | 'dropdown' | 'fullscreen';
  
  // Spacing
  navSpacing: 'compact' | 'normal' | 'relaxed';
  headerPadding: 'small' | 'medium' | 'large';
  navBackgroundColor?: string;
  navBorderColor?: string;
  pillBorderRadius?: number;
}
```

### Header Templates

```typescript
interface HeaderTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // Preview image URL or CSS gradient
  config: Partial<HeaderConfig>;
}

const HEADER_TEMPLATES: HeaderTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple with subtle styling',
    preview: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    config: {
      navStyle: 'default',
      backgroundEffect: 'solid',
      backgroundColor: '#0f172a',
      borderStyle: 'none',
      shadowStyle: 'none',
      fontWeight: 'normal',
      fontSize: 'normal',
      headerHeight: 'normal',
    }
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with pill navigation',
    preview: 'linear-gradient(135deg, #1e293b, #334155)',
    config: {
      navStyle: 'pills',
      backgroundEffect: 'solid',
      backgroundColor: '#0f172a',
      buttonBorderRadius: 24,
      hoverEffect: 'scale',
      shadowStyle: 'subtle',
    }
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with blur',
    preview: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    config: {
      navStyle: 'pills',
      backgroundEffect: 'glassmorphism',
      isTransparent: true,
      borderStyle: 'solid',
      borderColor: 'rgba(255,255,255,0.1)',
      shadowStyle: 'subtle',
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant glow effects and bold colors',
    preview: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
    config: {
      navStyle: 'outlined',
      backgroundEffect: 'solid',
      backgroundColor: '#0a0a1a',
      hoverEffect: 'glow',
      borderStyle: 'glow',
      shadowStyle: 'colored',
      accentColor: '#00ff88',
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional and business-focused',
    preview: 'linear-gradient(135deg, #1e3a5f, #2d5a87)',
    config: {
      navStyle: 'underline',
      backgroundEffect: 'solid',
      backgroundColor: '#1e3a5f',
      fontWeight: 'medium',
      textTransform: 'uppercase',
      letterSpacing: 'wide',
      headerHeight: 'tall',
    }
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Bold and energetic with gradients',
    preview: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    config: {
      navStyle: 'gradient',
      backgroundEffect: 'gradient',
      gradientColors: ['#4f46e5', '#7c3aed'],
      gradientDirection: '135deg',
      hoverEffect: 'lift',
      fontWeight: 'bold',
      shadowStyle: 'strong',
    }
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated with refined typography',
    preview: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
    config: {
      navStyle: 'ghost',
      backgroundEffect: 'solid',
      backgroundColor: '#1a1a1a',
      fontWeight: 'light',
      letterSpacing: 'extra-wide',
      textTransform: 'uppercase',
      fontSize: 'small',
      headerPadding: 'large',
    }
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong presence with thick buttons',
    preview: 'linear-gradient(135deg, #dc2626, #ea580c)',
    config: {
      navStyle: 'buttons',
      backgroundEffect: 'solid',
      backgroundColor: '#18181b',
      buttonBorderRadius: 8,
      buttonPadding: 'spacious',
      fontWeight: 'bold',
      fontSize: 'medium',
      hoverEffect: 'scale',
    }
  },
];
```

### ForumConfig Interface

```typescript
interface ForumConfig {
  // Template
  templateId?: string;
  
  // Layout
  layout: 'classic' | 'modern-card' | 'compact-list' | 'discord' | 'reddit' | 'minimal';
  
  // Post styling
  postCardStyle: 'flat' | 'raised' | 'bordered' | 'glassmorphism';
  categoryPillStyle: 'rounded' | 'square' | 'tag';
  avatarStyle: 'circle' | 'rounded-square' | 'square';
  postSpacing: 'compact' | 'normal' | 'relaxed';
  
  // Header
  showHeader: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  headerBackground: 'none' | 'gradient' | 'image' | 'pattern';
  headerBackgroundValue?: string;
  headerHeight: 'compact' | 'normal' | 'hero';
  
  // Colors
  accentColor: string;
  cardBackgroundColor?: string;
  borderColor?: string;
  
  // Typography
  titleFontSize: 'small' | 'normal' | 'large';
  showAuthorAvatar: boolean;
  showTimestamps: boolean;
  showViewCount: boolean;
  showReplyCount: boolean;
}
```

### Forum Templates

```typescript
interface ForumTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: Partial<ForumConfig>;
}

const FORUM_TEMPLATES: ForumTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional forum layout with clear hierarchy',
    preview: 'linear-gradient(135deg, #1e293b, #334155)',
    config: {
      layout: 'classic',
      postCardStyle: 'bordered',
      categoryPillStyle: 'rounded',
      avatarStyle: 'circle',
      postSpacing: 'normal',
      headerHeight: 'normal',
    }
  },
  {
    id: 'modern-card',
    name: 'Modern Card',
    description: 'Card-based layout with shadows and depth',
    preview: 'linear-gradient(135deg, #0f172a, #1e293b)',
    config: {
      layout: 'modern-card',
      postCardStyle: 'raised',
      categoryPillStyle: 'rounded',
      avatarStyle: 'rounded-square',
      postSpacing: 'relaxed',
      headerHeight: 'hero',
    }
  },
  {
    id: 'compact-list',
    name: 'Compact List',
    description: 'Dense list view for high-volume forums',
    preview: 'linear-gradient(135deg, #18181b, #27272a)',
    config: {
      layout: 'compact-list',
      postCardStyle: 'flat',
      categoryPillStyle: 'tag',
      avatarStyle: 'circle',
      postSpacing: 'compact',
      headerHeight: 'compact',
      showAuthorAvatar: false,
    }
  },
  {
    id: 'discord',
    name: 'Discord Style',
    description: 'Chat-like appearance inspired by Discord',
    preview: 'linear-gradient(135deg, #36393f, #2f3136)',
    config: {
      layout: 'discord',
      postCardStyle: 'flat',
      categoryPillStyle: 'rounded',
      avatarStyle: 'circle',
      postSpacing: 'compact',
      cardBackgroundColor: '#36393f',
    }
  },
  {
    id: 'reddit',
    name: 'Reddit Style',
    description: 'Upvote-focused layout like Reddit',
    preview: 'linear-gradient(135deg, #1a1a1b, #272729)',
    config: {
      layout: 'reddit',
      postCardStyle: 'bordered',
      categoryPillStyle: 'tag',
      avatarStyle: 'circle',
      postSpacing: 'normal',
      showViewCount: true,
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and distraction-free design',
    preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
    config: {
      layout: 'minimal',
      postCardStyle: 'flat',
      categoryPillStyle: 'square',
      avatarStyle: 'circle',
      postSpacing: 'relaxed',
      headerBackground: 'none',
      headerHeight: 'compact',
    }
  },
];
```

### Extended NavLink Interface

```typescript
interface NavLink {
  id: string;
  label: string;
  type: 'page' | 'external';
  pageSlug?: string;
  externalUrl?: string;
  openInNewTab?: boolean;
  order: number;
  icon?: string;
  showIcon?: boolean; // Individual icon toggle
  customColor?: string; // Per-link color override
}
```

### Icon Library

```typescript
const NAV_ICONS: Record<string, React.ElementType> = {
  home: Home,
  store: ShoppingBag,
  shop: ShoppingCart,
  roadmap: Map,
  community: MessageCircle,
  forum: Users,
  kb: BookOpen,
  docs: FileText,
  about: Info,
  tos: FileText,
  settings: Settings,
  profile: User,
  dashboard: LayoutDashboard,
  analytics: BarChart,
  products: Package,
  cart: ShoppingCart,
  heart: Heart,
  star: Star,
  bell: Bell,
  mail: Mail,
  search: Search,
  menu: Menu,
  grid: Grid,
  list: List,
  calendar: Calendar,
  clock: Clock,
  globe: Globe,
  link: Link,
  download: Download,
  upload: Upload,
};
```

## Data Models

### Database Schema (Supabase)

The header and forum configurations are stored in the existing `stores` table:

```sql
-- No new tables needed, configs stored in stores.page_builder_settings JSONB
-- Structure within page_builder_settings:
{
  "headerConfig": HeaderConfig,
  "forumConfig": ForumConfig,
  "sections": [...],
  ...
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Template Application Preserves Navigation Links

*For any* HeaderConfig with existing navLinks, when a header template is applied, the resulting config SHALL contain all original navLinks unchanged while all visual styling properties are updated to match the template.

**Validates: Requirements 1.2, 1.4**

### Property 2: Forum Template Application Preserves Data

*For any* forum with existing posts and categories, when a forum template is applied, all posts and categories SHALL remain unchanged while only visual styling properties are updated.

**Validates: Requirements 7.3, 7.4**

### Property 3: Border Radius Value Constraints

*For any* buttonBorderRadius value, the system SHALL accept values in the range [0, 50] and clamp or reject values outside this range.

**Validates: Requirements 2.3**

### Property 4: Split Navigation Distribution

*For any* set of N navigation links with navPosition set to 'split', the links SHALL be distributed as floor(N/2) links on the left and ceil(N/2) links on the right of the logo.

**Validates: Requirements 3.5**

### Property 5: Individual Icon Toggle Independence

*For any* navigation link, toggling its showIcon property SHALL only affect that specific link's icon visibility without affecting any other links.

**Validates: Requirements 6.1**

### Property 6: Text Customization Acceptance

*For any* valid string input for forum title or subtitle, the system SHALL accept and store the value, updating the display immediately.

**Validates: Requirements 9.1, 9.2**

### Property 7: Mobile Touch Target Size

*For any* interactive element in the forum on mobile viewport (width < 768px), the element SHALL have a minimum tap target size of 44x44 pixels.

**Validates: Requirements 10.4**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid template ID | Fall back to default config, log warning |
| Invalid color value | Use default color, show validation error |
| Border radius out of range | Clamp to valid range [0, 50] |
| Missing required config fields | Merge with DEFAULT_HEADER_CONFIG |
| Template application fails | Preserve current config, show error toast |
| Invalid icon key | Show no icon, log warning |

## Testing Strategy

### Unit Tests
- Test template application merges correctly with existing config
- Test border radius clamping logic
- Test split navigation distribution algorithm
- Test icon visibility toggle independence
- Test mobile menu style rendering

### Property-Based Tests
- Property 1: Generate random configs with navLinks, apply templates, verify links preserved
- Property 3: Generate random border radius values, verify clamping behavior
- Property 4: Generate random link counts, verify split distribution formula
- Property 5: Generate configs with multiple links, toggle icons individually, verify independence

### Integration Tests
- Test full header rendering with each template
- Test forum rendering with each template
- Test responsive behavior at breakpoints
- Test config persistence to Supabase
