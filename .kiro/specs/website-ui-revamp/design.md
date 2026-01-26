# Design Document: Website UI Revamp

## Overview

The Vectabase website UI revamp transforms the platform from a generic, static interface into a premium, interactive experience with modern animations, cohesive theming, and engaging user interactions. This design establishes a professional brand identity inspired by leading modern web experiences (Grok.ai, Avocado Systems, WFN Agency, Lapz) while maintaining accessibility and performance standards.

### Design Philosophy

1. **Motion as Communication**: Animations guide user attention and provide feedback
2. **Progressive Disclosure**: Content reveals as users scroll, creating a narrative journey
3. **Premium Aesthetics**: Dark theme with glassmorphism, gradients, and cinematic lighting
4. **Performance First**: 60fps animations with optimized loading and rendering
5. **Accessibility Always**: WCAG 2.1 AA compliance with reduced motion support

### Technology Stack

- **Animation Library**: Framer Motion (React animation library with declarative API)
- **Scroll Detection**: Intersection Observer API (native browser API for viewport detection)
- **Styling**: Tailwind CSS with custom design tokens
- **Performance**: React.lazy() for code splitting, lazy loading for images
- **Build Tool**: Vite for optimized bundling and tree-shaking

## Architecture

### Component Hierarchy

```
App
├── Layout (persistent navigation, footer)
│   ├── AnimatedNavigation
│   └── Footer
├── Pages (route-based components)
│   ├── IndexRevamped (prototype homepage)
│   ├── Index (production homepage after approval)
│   ├── About
│   ├── Shop
│   ├── ProductDetail
│   ├── CreatorProfile
│   ├── Store
│   ├── Dashboard
│   └── CommunityForums
└── Shared Components
    ├── AnimationWrappers
    │   ├── FadeIn
    │   ├── SlideUp
    │   ├── TypeWriter
    │   └── ScrollReveal
    ├── DesignSystem
    │   ├── Button
    │   ├── Card
    │   ├── Input
    │   └── Typography
    └── Effects
        ├── ParticleBackground
        ├── GradientOrb
        └── InteractiveGrid
```

### Animation Architecture

**Animation Flow**:
1. User scrolls page
2. Intersection Observer detects elements entering viewport
3. Observer triggers state change in React component
4. Framer Motion animates element based on variant
5. Animation completes, element remains in final state

**Performance Strategy**:
- Use `will-change` CSS property sparingly for GPU acceleration
- Animate only transform and opacity properties (GPU-accelerated)
- Debounce scroll events to reduce computation
- Use `useReducedMotion` hook to respect user preferences
- Lazy load animation library code per route

### State Management

**Animation State**:
- Track which elements have been animated (prevent re-animation)
- Store user motion preferences (reduced motion setting)
- Manage loading states for lazy-loaded content

**Design System State**:
- Theme configuration (colors, spacing, typography)
- Breakpoint detection for responsive behavior
- Component variant selections

## Components and Interfaces

### Animation Wrapper Components

#### ScrollReveal Component
```typescript
interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  once?: boolean; // Animate only once
}

// Usage:
<ScrollReveal direction="up" delay={0.2}>
  <FeatureCard />
</ScrollReveal>
```

**Behavior**:
- Wraps any child component
- Uses Intersection Observer to detect viewport entry
- Triggers Framer Motion animation when visible
- Supports directional slides and configurable timing
- Respects `prefers-reduced-motion`

#### TypeWriter Component
```typescript
interface TypeWriterProps {
  text: string;
  speed?: number; // Characters per second
  delay?: number; // Delay before starting
  cursor?: boolean; // Show blinking cursor
  onComplete?: () => void;
}

// Usage:
<TypeWriter 
  text="Welcome to Vectabase" 
  speed={50}
  cursor={true}
/>
```

**Behavior**:
- Animates text character-by-character
- Starts when element enters viewport
- Optional blinking cursor effect
- Callback when animation completes


#### FadeIn Component
```typescript
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
}

// Usage:
<FadeIn delay={0.3} duration={0.6}>
  <ProductCard />
</FadeIn>
```

**Behavior**:
- Simple opacity transition from 0 to 1
- Lightweight alternative to ScrollReveal
- Useful for staggered content reveals

#### ParticleBackground Component
```typescript
interface ParticleBackgroundProps {
  particleCount?: number;
  color?: string;
  speed?: number;
  interactive?: boolean; // Respond to mouse movement
}

// Usage:
<ParticleBackground 
  particleCount={50}
  color="#6366f1"
  interactive={true}
/>
```

**Behavior**:
- Canvas-based particle system
- Particles drift with configurable speed
- Optional mouse interaction (particles attracted/repelled)
- Rendered behind content with low z-index
- Paused when tab is inactive for performance

### Design System Components

#### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Variants:
// - primary: Solid accent color with hover scale
// - secondary: Muted background with hover brightness
// - ghost: Transparent with hover background
// - outline: Border only with hover fill
```

**Animations**:
- Hover: Scale 1.05, brightness increase
- Active: Scale 0.95
- Loading: Spinner with pulse animation
- Disabled: Reduced opacity, no hover effects

#### Card Component
```typescript
interface CardProps {
  variant: 'default' | 'glass' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: React.ReactNode;
}

// Variants:
// - default: Solid background with subtle border
// - glass: Glassmorphism with backdrop blur
// - elevated: Shadow with hover lift effect
```

**Animations**:
- Hover (if hoverable): Translate Y -4px, shadow increase
- Entrance: Fade in with slight scale up


#### Input Component
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}
```

**Animations**:
- Focus: Border color transition, label slide up
- Error: Shake animation, red border pulse
- Disabled: Reduced opacity, no interactions

### Page-Specific Components

#### Homepage Hero Section
```typescript
interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundEffect: 'particles' | 'gradient' | 'grid';
}
```

**Layout**:
- Full viewport height (100vh)
- Centered content with max-width container
- Animated background effect
- TypeWriter effect on title
- Fade-in subtitle with delay
- Prominent CTA button with pulse animation

**Animation Sequence**:
1. Background effect starts immediately (0s)
2. Title types in (0.5s delay, 2s duration)
3. Subtitle fades in (2.5s delay, 0.8s duration)
4. CTA button scales in (3.3s delay, 0.5s duration)

#### Feature Section
```typescript
interface FeatureSectionProps {
  title: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  layout: 'grid' | 'carousel' | 'stacked';
}
```

**Layout**:
- Section title with scroll-triggered reveal
- Feature cards in responsive grid (1/2/3 columns)
- Each card reveals with stagger delay
- Icons animate on hover (rotate, scale, or color shift)

#### Product Grid
```typescript
interface ProductGridProps {
  products: Product[];
  columns: 2 | 3 | 4;
  showFilters?: boolean;
}
```

**Animations**:
- Grid items fade in with stagger (50ms between each)
- Hover: Card lifts, image scales slightly
- Filter changes: Fade out old items, fade in new items
- Loading: Skeleton cards with shimmer effect

## Data Models

### Design Tokens
```typescript
interface DesignTokens {
  colors: {
    background: {
      primary: string;    // Main dark background
      secondary: string;  // Slightly lighter for cards
      tertiary: string;   // Even lighter for hover states
    };
    accent: {
      primary: string;    // Main brand color
      secondary: string;  // Secondary accent
      gradient: string;   // Gradient definition
    };
    text: {
      primary: string;    // High contrast text
      secondary: string;  // Muted text
      tertiary: string;   // Very muted text
    };
    border: {
      default: string;
      focus: string;
      error: string;
    };
  };
  spacing: {
    xs: string;   // 4px
    sm: string;   // 8px
    md: string;   // 16px
    lg: string;   // 24px
    xl: string;   // 32px
    '2xl': string; // 48px
    '3xl': string; // 64px
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
      mono: string;
    };
    fontSize: {
      xs: string;   // 12px
      sm: string;   // 14px
      base: string; // 16px
      lg: string;   // 18px
      xl: string;   // 20px
      '2xl': string; // 24px
      '3xl': string; // 30px
      '4xl': string; // 36px
      '5xl': string; // 48px
    };
    fontWeight: {
      normal: number;   // 400
      medium: number;   // 500
      semibold: number; // 600
      bold: number;     // 700
    };
    lineHeight: {
      tight: number;   // 1.25
      normal: number;  // 1.5
      relaxed: number; // 1.75
    };
  };
  animation: {
    duration: {
      fast: string;     // 150ms
      normal: string;   // 300ms
      slow: string;     // 500ms
    };
    easing: {
      default: string;  // cubic-bezier(0.4, 0, 0.2, 1)
      in: string;       // cubic-bezier(0.4, 0, 1, 1)
      out: string;      // cubic-bezier(0, 0, 0.2, 1)
      inOut: string;    // cubic-bezier(0.4, 0, 0.2, 1)
    };
  };
  breakpoints: {
    sm: string;   // 640px
    md: string;   // 768px
    lg: string;   // 1024px
    xl: string;   // 1280px
    '2xl': string; // 1536px
  };
}
```


### Animation Variants (Framer Motion)
```typescript
// Reusable animation variants for consistency
const animationVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  },
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};
```

### Scroll Observer Hook
```typescript
interface UseScrollRevealOptions {
  threshold?: number;      // 0-1, how much visible before trigger
  rootMargin?: string;     // Margin around viewport
  triggerOnce?: boolean;   // Animate only once
}

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  hasBeenVisible: boolean;
}

// Usage:
const { ref, isVisible } = useScrollReveal({ 
  threshold: 0.2,
  triggerOnce: true 
});
```

### Page Structure Models

#### Homepage Structure
```typescript
interface HomepageData {
  hero: {
    title: string;
    subtitle: string;
    cta: { text: string; link: string };
    backgroundEffect: 'particles' | 'gradient' | 'grid';
  };
  features: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
  }>;
  showcase: {
    title: string;
    products: Product[];
  };
  testimonials: Array<{
    id: string;
    author: string;
    role: string;
    content: string;
    avatar: string;
  }>;
  cta: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}
```

#### Product Card Model
```typescript
interface ProductCard {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  tags: string[];
}
```

## Specific Page Designs

### IndexRevamped (Prototype Homepage)

**Purpose**: Demonstrate new design direction for stakeholder approval before full implementation.

**Sections**:
1. **Hero Section**
   - Full viewport height
   - Animated gradient background with particle overlay
   - TypeWriter title: "Build, Sell, Scale with Vectabase"
   - Subtitle fades in after title completes
   - Two CTAs: "Get Started" (primary) and "Explore Marketplace" (secondary)
   - Scroll indicator with bounce animation

2. **Features Section**
   - Title: "Everything You Need to Succeed"
   - 3-column grid on desktop, 1-column on mobile
   - Features: Marketplace, Creator Tools, Community
   - Each card reveals on scroll with stagger
   - Icons animate on hover (rotate 360deg)

3. **Showcase Section**
   - Title: "Featured Products"
   - Horizontal scrolling carousel on mobile
   - 3-column grid on desktop
   - Product cards with hover lift effect
   - "View All" button at bottom

4. **CTA Section**
   - Centered content with gradient background
   - Title: "Ready to Start Selling?"
   - Description paragraph
   - Large primary button
   - Background particles respond to mouse movement

**Route**: `/prototype` or `/index-revamped`

**Implementation Notes**:
- Create as separate component to avoid disrupting production homepage
- Use all new design system components
- Implement full animation suite
- Optimize for performance (target 90+ Lighthouse score)
- Include accessibility features (keyboard nav, ARIA labels)


### Community Forums Redesign

**Current Issues**:
- Layout too large, overwhelming for private websites
- Poor visual hierarchy
- No animations or modern interactions
- Generic styling

**New Design**:

**Layout**:
- Compact card-based design
- Maximum width: 1200px (centered)
- Sidebar navigation (collapsible on mobile)
- Thread list with preview cards

**Thread Card**:
```typescript
interface ThreadCard {
  id: string;
  title: string;
  author: {
    name: string;
    avatar: string;
  };
  preview: string;        // First 150 chars
  replies: number;
  views: number;
  lastActivity: Date;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
}
```

**Animations**:
- Thread cards fade in with stagger on load
- Hover: Card lifts slightly, border color changes
- Click: Smooth page transition to thread detail
- New reply: Slide in from bottom with highlight
- Pinned threads: Subtle pulse animation on pin icon

**Visual Improvements**:
- Avatar images with border and shadow
- Tag pills with accent colors
- Reply/view counts with icons
- Relative timestamps ("2 hours ago")
- Status indicators (pinned, locked, unread)

### Shop/Marketplace Redesign

**Layout**:
- Filter sidebar (collapsible on mobile)
- Product grid: 2 columns (mobile), 3 columns (tablet), 4 columns (desktop)
- Sort dropdown with smooth transitions
- Search bar with autocomplete

**Product Card Hover Effect**:
1. Card lifts (translateY: -8px)
2. Shadow increases
3. Image scales slightly (scale: 1.05)
4. "Quick View" button fades in
5. Creator avatar slides up

**Filtering Animation**:
- When filter applied: Current products fade out (200ms)
- New products fade in with stagger (50ms between each)
- Loading state: Skeleton cards with shimmer

**Empty State**:
- Illustration or icon
- "No products found" message
- Suggested actions (clear filters, browse all)
- Animated with fade-in

### Dashboard Redesign

**Layout**:
- Sidebar navigation (persistent on desktop, drawer on mobile)
- Main content area with cards
- Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

**Stat Cards**:
```typescript
interface StatCard {
  label: string;
  value: number | string;
  change?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon: React.ReactNode;
  trend?: number[];  // Sparkline data
}
```

**Animations**:
- Numbers count up on mount (using react-countup or similar)
- Charts animate in with draw effect
- Hover on stat cards: Slight scale and shadow increase
- Data updates: Smooth transitions, not instant replacements

**Chart Components**:
- Revenue chart: Area chart with gradient fill
- Sales chart: Bar chart with hover tooltips
- Traffic chart: Line chart with multiple series
- All charts use smooth animations on data changes

### Product Detail Page

**Layout**:
- Two-column layout (desktop): Image gallery left, details right
- Single column (mobile): Image gallery top, details below
- Sticky purchase section on scroll

**Image Gallery**:
- Main image with zoom on hover
- Thumbnail strip below
- Click thumbnail: Smooth transition to main image
- Lightbox mode: Full-screen gallery with navigation

**Details Section**:
- Product title (large, bold)
- Creator info with avatar and link
- Price with currency
- Description with expandable "Read More"
- Feature list with checkmark icons
- Tags with accent colors
- Purchase button (sticky on mobile)

**Animations**:
- Image transitions: Crossfade effect
- Scroll reveal: Details sections fade in as user scrolls
- Add to cart: Button success animation (checkmark, color change)
- Related products: Horizontal scroll with momentum

### About Page

**Storytelling Approach**:
- Vertical scroll with distinct sections
- Each section reveals as user scrolls
- Mix of text, images, and interactive elements

**Sections**:
1. **Hero**: Mission statement with animated background
2. **Story**: Timeline of company milestones with scroll-triggered reveals
3. **Team**: Grid of team members with hover effects
4. **Values**: Icon cards with descriptions
5. **CTA**: Join the community section

**Timeline Component**:
```typescript
interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  image?: string;
}
```

**Animation**: Events reveal one by one as user scrolls, with connecting line drawing between them.

### Creator Profile & Store Pages

**Profile Header**:
- Cover image with parallax scroll effect
- Avatar with border and shadow
- Creator name and bio
- Social links with hover animations
- Follow button with loading state

**Store Customization**:
- Theme color picker (updates accent colors)
- Banner image upload with preview
- Bio editor with character count
- Social links manager

**Product Display**:
- Grid layout matching marketplace design
- "Featured" section at top
- Category tabs with smooth transitions
- Load more button with loading animation


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Animation and Interaction Properties

**Property 1: Scroll-triggered animation activation**
*For any* element with scroll-triggered animation, when that element enters the viewport, the animation should trigger exactly once and complete successfully.
**Validates: Requirements 1.1, 2.1, 2.2**

**Property 2: Text reveal animations**
*For any* text element configured with reveal animation, when the element enters the viewport, the text should animate with the specified effect (typing, fade, or slide) and complete in the configured duration.
**Validates: Requirements 1.2**

**Property 3: Hover interaction feedback**
*For any* interactive element, when a hover event occurs, the element should provide immediate visual feedback through CSS transitions within 150ms.
**Validates: Requirements 1.3**

**Property 4: Non-blocking animations**
*For any* running animation, user interactions (clicks, scrolls, keyboard input) should remain responsive and not be blocked by the animation.
**Validates: Requirements 1.5**

**Property 5: Animation stagger timing**
*For any* group of elements with staggered animations, when multiple elements enter the viewport simultaneously, each element's animation should start with the configured delay offset from the previous element.
**Validates: Requirements 2.3**

**Property 6: Rapid scroll handling**
*For any* sequence of rapid scroll events, the scroll observer should handle all events without errors, and animations should complete or cancel gracefully without visual glitches.
**Validates: Requirements 2.5**

**Property 7: Lazy loading behavior**
*For any* lazy-loaded image or component, the resource should not load until the element is within a configured threshold distance from the viewport.
**Validates: Requirements 2.6**

**Property 8: Interactive background responsiveness**
*For any* interactive background effect, when mouse movement or scroll events occur, the effect should respond with visual changes within one animation frame.
**Validates: Requirements 12.2**

**Property 9: Device-based effect simplification**
*For any* complex background effect, when rendered on a mobile viewport (width < 768px), the effect should use a simplified version or be disabled entirely.
**Validates: Requirements 12.5**

### User Interface Properties

**Property 10: Product card hover reveal**
*For any* product card, when a hover event occurs, additional information should fade in smoothly and the card should lift with a transform animation.
**Validates: Requirements 7.2**

**Property 11: Filter transition animations**
*For any* product grid with active filters, when filter values change, current products should fade out before new products fade in with stagger delays.
**Validates: Requirements 7.3**

**Property 12: Loading state animations**
*For any* component in a loading state, the component should display either a skeleton loader with shimmer animation or a fade-in animation when content becomes available.
**Validates: Requirements 7.6**

**Property 13: Chart data update transitions**
*For any* chart component, when data updates occur, the chart should animate the transition from old values to new values rather than instantly replacing them.
**Validates: Requirements 8.2**

**Property 14: Chart tooltip display**
*For any* interactive chart element, when a hover event occurs, a tooltip with detailed information should appear within 100ms.
**Validates: Requirements 8.5**

**Property 15: Forum navigation transitions**
*For any* navigation action within the forum (thread to category, thread to detail), the page transition should include a smooth fade or slide animation.
**Validates: Requirements 6.3**

**Property 16: Click feedback animation**
*For any* interactive element, when a click event occurs, the element should provide visual feedback (ripple, scale, or color change) that completes within 300ms.
**Validates: Requirements 17.2**

**Property 17: Form submission feedback**
*For any* form submission, the system should display animated success or error feedback within 200ms of submission completion.
**Validates: Requirements 17.4**

**Property 18: Cursor indication**
*For any* interactive element (buttons, links, cards with click handlers), the cursor should change to pointer when hovering over the element.
**Validates: Requirements 17.5**

**Property 19: Route transition animations**
*For any* navigation between routes, the page transition should include a fade or slide animation that completes before the new page content is fully visible.
**Validates: Requirements 17.6**

**Property 20: Product image interaction transitions**
*For any* product image interaction (zoom, gallery navigation, lightbox), the transition should be smooth with a duration between 200-400ms.
**Validates: Requirements 18.2**

**Property 21: About page sequential reveals**
*For any* section on the About page, sections should reveal in sequential order with each section starting its animation only after the previous section's animation begins.
**Validates: Requirements 16.2**

### Responsive Design Properties

**Property 22: Viewport-based layout adaptation**
*For any* responsive component, when the viewport width changes across breakpoints (640px, 768px, 1024px), the component's layout should adapt to the appropriate mobile, tablet, or desktop configuration.
**Validates: Requirements 9.1**

**Property 23: Responsive typography and spacing**
*For any* text or spaced element, when the viewport width changes across breakpoints, typography sizes and spacing values should adjust according to the responsive scale defined in the design system.
**Validates: Requirements 9.2**

**Property 24: Touch target sizing**
*For any* interactive element on mobile viewports (width < 768px), the element's tap target should be at least 44x44 pixels to ensure touch-friendly interaction.
**Validates: Requirements 9.4**

**Property 25: Mobile animation simplification**
*For any* complex animation, when rendered on mobile viewports (width < 768px), the animation should use a simplified version with reduced particle counts or disabled effects.
**Validates: Requirements 9.5**

### Accessibility Properties

**Property 26: Heading hierarchy compliance**
*For any* page, heading elements should follow proper hierarchical order (h1 → h2 → h3) without skipping levels.
**Validates: Requirements 10.1**

**Property 27: Color contrast compliance**
*For any* text element, the contrast ratio between text color and background color should meet or exceed 4.5:1 for normal text and 3:1 for large text (18px+ or 14px+ bold).
**Validates: Requirements 10.2**

**Property 28: Keyboard navigation support**
*For any* interactive element, the element should be reachable via keyboard tab navigation and should display a visible focus indicator when focused.
**Validates: Requirements 10.3**

**Property 29: Image alt text presence**
*For any* meaningful image element, the img tag should include a non-empty alt attribute describing the image content.
**Validates: Requirements 10.4**

**Property 30: ARIA label presence**
*For any* complex interactive component (modals, dropdowns, custom controls), the component should include appropriate ARIA attributes (aria-label, aria-labelledby, or aria-describedby).
**Validates: Requirements 10.5**


### Configuration and Structure Properties (Examples)

These are specific examples that verify the design system and component structure are properly configured:

**Example 1: Design system typography configuration**
The design system configuration file should export a typography object with defined fontFamily, fontSize, fontWeight, and lineHeight properties.
**Validates: Requirements 3.2**

**Example 2: Design system spacing scale**
The design system configuration file should export a spacing object with values following the scale: xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px).
**Validates: Requirements 3.3**

**Example 3: Component library exports**
The design system should export Button, Card, Input, and Navigation components with proper TypeScript types.
**Validates: Requirements 3.4**

**Example 4: Glassmorphism utility**
The design system should export a glassmorphism utility function or CSS class that applies backdrop-filter: blur() and semi-transparent background.
**Validates: Requirements 3.5**

**Example 5: Design tokens centralization**
A single configuration file (e.g., design-tokens.ts or tailwind.config.js) should contain all color, spacing, typography, and animation token definitions.
**Validates: Requirements 3.6**

**Example 6: Reduced motion support**
When the prefers-reduced-motion media query is set to "reduce", decorative animations should be disabled or replaced with simple fades.
**Validates: Requirements 1.6**

**Example 7: Homepage hero section presence**
The homepage should render a hero section component with animated background effects (particles, gradient, or grid).
**Validates: Requirements 4.1**

**Example 8: Homepage animated text**
The homepage hero section should include a TypeWriter or animated text component displaying the main value proposition.
**Validates: Requirements 4.2**

**Example 9: Homepage feature cards**
The homepage should render at least 3 feature cards with icons and descriptions in a responsive grid layout.
**Validates: Requirements 4.4**

**Example 10: Prototype page component**
A separate component file (IndexRevamped.tsx or similar) should exist and export a React component for the prototype homepage.
**Validates: Requirements 5.1**

**Example 11: Prototype hero section**
The prototype page should render a hero section with animated text and background effects demonstrating the new design direction.
**Validates: Requirements 5.2**

**Example 12: Prototype feature sections**
The prototype page should include at least 2 feature sections with scroll-triggered reveal animations.
**Validates: Requirements 5.3**

**Example 13: Prototype design system usage**
The prototype page components should use design system tokens for colors, spacing, and typography rather than hardcoded values.
**Validates: Requirements 5.4**

**Example 14: Prototype route configuration**
The application router should include a route (e.g., /prototype or /index-revamped) that renders the prototype page component.
**Validates: Requirements 5.6**

**Example 15: Forum layout constraints**
The forum container should have a max-width of 1200px and be centered on the page.
**Validates: Requirements 6.1**

**Example 16: Forum card layout**
Forum threads should render as card components with consistent padding, borders, and shadows from the design system.
**Validates: Requirements 6.2**

**Example 17: Forum avatar styling**
Forum thread cards should display user avatars with consistent sizing, borders, and shadows.
**Validates: Requirements 6.4**

**Example 18: Forum typography**
Forum text should use font sizes of at least 14px for body text and line-height of at least 1.5 for readability.
**Validates: Requirements 6.6**

**Example 19: Shop grid layout**
The shop page should render products in a responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop.
**Validates: Requirements 7.1**

**Example 20: Product detail image gallery**
The product detail page should include an image gallery component with zoom or lightbox functionality.
**Validates: Requirements 7.4**

**Example 21: Dashboard chart components**
The dashboard should render chart components (area, bar, or line charts) with animation on mount.
**Validates: Requirements 8.1**

**Example 22: Dashboard card layout**
The dashboard should use card components with consistent spacing and shadows for organizing content sections.
**Validates: Requirements 8.3**

**Example 23: Dashboard metric highlighting**
Key metrics on the dashboard should use distinct styling (larger font size, accent colors, or icons) to emphasize importance.
**Validates: Requirements 8.4**

**Example 24: Code splitting configuration**
The build configuration should use dynamic imports (React.lazy) for route-based code splitting.
**Validates: Requirements 11.2**

**Example 25: Bundle size limits**
The main JavaScript bundle should be under 200KB gzipped, with additional route chunks under 100KB each.
**Validates: Requirements 11.5**

**Example 26: Hero background effects**
Hero sections should include a background effect component (ParticleBackground, GradientOrb, or InteractiveGrid).
**Validates: Requirements 12.1**

**Example 27: Typography line height**
Text elements should use line-height values between 1.4 and 1.8 for body text to ensure readability.
**Validates: Requirements 13.4**

**Example 28: Text block width constraints**
Large text blocks should have a max-width of 65-75 characters (approximately 600-700px) for optimal readability.
**Validates: Requirements 13.5**

**Example 29: Button component variants**
The Button component should support variants: primary, secondary, ghost, and outline with distinct styling for each.
**Validates: Requirements 14.1**

**Example 30: Card component variants**
The Card component should support variants: default, glass, and elevated with appropriate styling (backdrop-blur for glass, shadows for elevated).
**Validates: Requirements 14.2**

**Example 31: Input focus states**
Input components should have distinct focus states with border color changes and optional glow effects.
**Validates: Requirements 14.3**

**Example 32: Navigation transitions**
Navigation components should include CSS transitions for hover and active states with durations between 150-300ms.
**Validates: Requirements 14.4**

**Example 33: Animation wrapper components**
The component library should export animation wrapper components: FadeIn, SlideUp, ScrollReveal, and TypeWriter.
**Validates: Requirements 14.5**

**Example 34: Creator page header**
The creator profile page should render a header section with cover image, avatar, name, bio, and social links.
**Validates: Requirements 15.1**

**Example 35: Store product grid**
The store page should use the same product grid component and styling as the main marketplace.
**Validates: Requirements 15.2**

**Example 36: Store customization UI**
The store page should include UI controls for customization (theme color picker, banner upload, bio editor).
**Validates: Requirements 15.4**

**Example 37: Creator statistics display**
The creator page should display statistics (total sales, downloads, followers) with visual emphasis using cards or highlighted sections.
**Validates: Requirements 15.5**

**Example 38: Store navigation**
The store page should include navigation elements (tabs or links) for browsing between product categories.
**Validates: Requirements 15.6**

**Example 39: About page content elements**
The About page should include visual elements such as a timeline component, team member grid, or mission statement section.
**Validates: Requirements 16.3**

**Example 40: About page interactivity**
The About page should include at least one interactive element (timeline navigation, team member hover cards, or animated statistics).
**Validates: Requirements 16.5**

**Example 41: Loading state components**
The component library should export loading state components: Spinner, SkeletonCard, and SkeletonText.
**Validates: Requirements 17.3**

**Example 42: Product detail CTA button**
The product detail page should display a prominent purchase button with animation (hover scale, loading state).
**Validates: Requirements 18.5**

**Example 43: Framer Motion integration**
The package.json should include framer-motion as a dependency, and animation components should import from it.
**Validates: Requirements 20.1**

**Example 44: Scroll animation utilities**
The codebase should export utility functions or hooks (e.g., useScrollReveal, useInView) for implementing scroll-triggered animations.
**Validates: Requirements 20.3**

**Example 45: Animation default configuration**
The animation library should be configured with default duration (300ms) and easing (cubic-bezier) values for consistency.
**Validates: Requirements 20.5**

## Error Handling

### Animation Errors

**Intersection Observer Unavailability**:
- Detect if Intersection Observer is not supported (older browsers)
- Fallback: Show all content immediately without scroll animations
- Log warning to console for debugging

**Animation Library Load Failure**:
- Wrap Framer Motion imports in try-catch blocks
- Fallback: Render content without animations
- Display error boundary with user-friendly message

**Performance Degradation**:
- Monitor frame rate during animations
- If frame rate drops below 30fps consistently, disable complex animations
- Simplify effects (reduce particle count, disable blur effects)

### Component Errors

**Image Load Failures**:
- Display placeholder image or icon
- Show "Image unavailable" message
- Retry loading after delay (exponential backoff)

**Chart Rendering Errors**:
- Catch errors in chart components
- Display fallback message: "Unable to load chart"
- Log error details for debugging

**Route Transition Errors**:
- Catch navigation errors
- Complete transition even if animation fails
- Ensure user reaches destination page

### Responsive Errors

**Breakpoint Detection Failures**:
- Default to mobile layout if detection fails
- Use CSS media queries as fallback
- Ensure content remains accessible

**Touch Event Errors**:
- Gracefully handle touch event failures
- Fall back to click events
- Maintain functionality on all devices

## Testing Strategy

### Dual Testing Approach

This project requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Component rendering with specific props
- User interaction flows (click, hover, submit)
- Error boundary behavior
- Accessibility features (ARIA labels, keyboard navigation)
- Edge cases (empty states, loading states, error states)

**Property Tests**: Verify universal properties across all inputs
- Animation behavior across all animatable elements
- Responsive behavior across all breakpoint ranges
- Accessibility compliance across all interactive elements
- Color contrast across all text/background combinations
- Keyboard navigation across all interactive components

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library**: Use `@fast-check/jest` for property-based testing in TypeScript/React

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: website-ui-revamp, Property {number}: {property_text}`

**Example Property Test**:
```typescript
// Feature: website-ui-revamp, Property 1: Scroll-triggered animation activation
test('scroll-triggered animations activate exactly once', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ id: fc.string(), animation: fc.string() })),
      (elements) => {
        // Test that each element animates exactly once when entering viewport
        // ... test implementation
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Component Rendering**:
- Verify components render without errors
- Test prop variations and edge cases
- Verify correct HTML structure and classes

**User Interactions**:
- Test click, hover, focus, and keyboard events
- Verify state changes after interactions
- Test form submissions and validations

**Accessibility**:
- Verify ARIA attributes are present
- Test keyboard navigation flows
- Verify focus management

**Error Boundaries**:
- Test component error handling
- Verify fallback UI displays correctly
- Test error recovery mechanisms

### Integration Testing

**Page-Level Tests**:
- Test complete page rendering
- Verify navigation between pages
- Test data loading and display

**Animation Integration**:
- Test animation sequences complete correctly
- Verify animations don't block interactions
- Test reduced motion preferences

**Responsive Behavior**:
- Test layout changes at breakpoints
- Verify touch interactions on mobile
- Test orientation changes

### Performance Testing

**Lighthouse Audits**:
- Run Lighthouse on all major pages
- Target: 90+ performance score on desktop
- Monitor Core Web Vitals (LCP, FID, CLS)

**Animation Performance**:
- Use Chrome DevTools Performance panel
- Monitor frame rate during animations
- Identify and optimize animation bottlenecks

**Bundle Size Monitoring**:
- Track bundle sizes in CI/CD
- Alert on significant size increases
- Verify code splitting is effective

### Accessibility Testing

**Automated Tools**:
- Run axe-core or similar accessibility scanner
- Verify WCAG 2.1 AA compliance
- Test with screen reader (NVDA, JAWS, VoiceOver)

**Manual Testing**:
- Navigate entire site with keyboard only
- Test with reduced motion enabled
- Verify color contrast in all themes

### Browser Compatibility Testing

**Target Browsers**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Testing Approach**:
- Use BrowserStack or similar for cross-browser testing
- Test critical user flows in each browser
- Verify animations work consistently

### Test Coverage Goals

- Unit test coverage: 80%+ for components
- Property test coverage: All 30 properties implemented
- Integration test coverage: All major user flows
- Accessibility: 100% WCAG 2.1 AA compliance
- Performance: 90+ Lighthouse score on all pages
