# Implementation Plan: Website UI Revamp

## Overview

This implementation plan transforms the Vectabase platform from a generic, static website into a premium, interactive experience with modern animations, cohesive theming, and engaging user interactions. The plan follows an incremental approach: establish the design system foundation, create reusable animation components, build the prototype homepage for approval, then systematically redesign each page.

## Tasks

- [ ] 1. Set up design system foundation
  - [ ] 1.1 Create design tokens configuration file
    - Define color palette (background, accent, text, border colors)
    - Define spacing scale (xs through 3xl)
    - Define typography system (font families, sizes, weights, line heights)
    - Define animation defaults (durations, easing functions)
    - Define breakpoints for responsive design
    - Export all tokens as TypeScript constants or Tailwind config
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 19.1, 19.2, 19.4_
  
  - [ ]* 1.2 Write property test for design token structure
    - **Property: Design system typography configuration (Example 1)**
    - **Validates: Requirements 3.2**
  
  - [ ]* 1.3 Write property test for spacing scale
    - **Property: Design system spacing scale (Example 2)**
    - **Validates: Requirements 3.3**

- [ ] 2. Integrate animation library and create utilities
  - [ ] 2.1 Install and configure Framer Motion
    - Add framer-motion to package.json
    - Create animation configuration file with default variants
    - Define reusable animation variants (fadeIn, slideUp, slideDown, slideLeft, slideRight, scale, stagger)
    - Configure default transition settings
    - _Requirements: 20.1, 20.5_
  
  - [ ] 2.2 Create scroll observation hook (useScrollReveal)
    - Implement hook using Intersection Observer API
    - Support threshold, rootMargin, and triggerOnce options
    - Return ref, isVisible, and hasBeenVisible states
    - Handle cleanup on unmount
    - _Requirements: 2.1, 2.4_
  
  - [ ] 2.3 Create useReducedMotion hook
    - Detect prefers-reduced-motion media query
    - Return boolean indicating if reduced motion is preferred
    - Update on media query changes
    - _Requirements: 1.6, 10.6_
  
  - [ ]* 2.4 Write property test for scroll observer detection
    - **Property 1: Scroll-triggered animation activation**
    - **Validates: Requirements 1.1, 2.1, 2.2**
  
  - [ ]* 2.5 Write property test for reduced motion support
    - **Property: Reduced motion support (Example 6)**
    - **Validates: Requirements 1.6**
  
  - [ ]* 2.6 Write property test for lazy loading behavior
    - **Property 7: Lazy loading behavior**
    - **Validates: Requirements 2.6**

- [ ] 3. Create animation wrapper components
  - [ ] 3.1 Implement ScrollReveal component
    - Accept children, direction, delay, duration, once props
    - Use useScrollReveal hook for viewport detection
    - Use Framer Motion for animation
    - Respect useReducedMotion hook
    - _Requirements: 1.1, 2.1, 2.2_
  
  - [ ] 3.2 Implement FadeIn component
    - Accept children, delay, duration, once props
    - Simple opacity transition using Framer Motion
    - Respect useReducedMotion hook
    - _Requirements: 1.1_
  
  - [ ] 3.3 Implement TypeWriter component
    - Accept text, speed, delay, cursor, onComplete props
    - Animate text character-by-character
    - Start animation when element enters viewport
    - Optional blinking cursor effect
    - Respect useReducedMotion (show text immediately if reduced motion)
    - _Requirements: 1.2, 13.1_
  
  - [ ] 3.4 Implement ParticleBackground component
    - Accept particleCount, color, speed, interactive props
    - Use HTML5 Canvas for rendering
    - Implement particle physics (drift, mouse interaction)
    - Pause when tab is inactive
    - Simplify on mobile viewports
    - _Requirements: 12.1, 12.2, 12.5_
  
  - [ ]* 3.5 Write property test for text reveal animations
    - **Property 2: Text reveal animations**
    - **Validates: Requirements 1.2**
  
  - [ ]* 3.6 Write property test for animation stagger timing
    - **Property 5: Animation stagger timing**
    - **Validates: Requirements 2.3**
  
  - [ ]* 3.7 Write property test for non-blocking animations
    - **Property 4: Non-blocking animations**
    - **Validates: Requirements 1.5**
  
  - [ ]* 3.8 Write property test for interactive background responsiveness
    - **Property 8: Interactive background responsiveness**
    - **Validates: Requirements 12.2**

- [ ] 4. Build design system components
  - [ ] 4.1 Create Button component
    - Support variants: primary, secondary, ghost, outline
    - Support sizes: sm, md, lg
    - Include hover animations (scale, brightness)
    - Include loading state with spinner
    - Include disabled state
    - Support icon prop
    - _Requirements: 3.4, 14.1_
  
  - [ ] 4.2 Create Card component
    - Support variants: default, glass, elevated
    - Support padding sizes: sm, md, lg
    - Include hoverable prop for lift effect
    - Apply glassmorphism for glass variant (backdrop-blur)
    - Apply shadows for elevated variant
    - _Requirements: 3.4, 14.2_
  
  - [ ] 4.3 Create Input component
    - Support types: text, email, password, number
    - Include label, placeholder, error props
    - Include focus animations (border color, label slide)
    - Include error animations (shake, red border pulse)
    - Include disabled state
    - Support icon prop
    - _Requirements: 3.4, 14.3_
  
  - [ ] 4.4 Create glassmorphism and gradient utilities
    - Create CSS utility classes or functions for glassmorphism effect
    - Create gradient utility functions for common gradient patterns
    - Export from design system
    - _Requirements: 3.5, 19.5_
  
  - [ ]* 4.5 Write property test for hover interaction feedback
    - **Property 3: Hover interaction feedback**
    - **Validates: Requirements 1.3**
  
  - [ ]* 4.6 Write property test for click feedback animation
    - **Property 16: Click feedback animation**
    - **Validates: Requirements 17.2**
  
  - [ ]* 4.7 Write unit tests for Button component variants
    - Test all variants render correctly
    - Test hover and click interactions
    - Test loading and disabled states
    - _Requirements: 14.1_
  
  - [ ]* 4.8 Write unit tests for Card component variants
    - Test all variants render correctly
    - Test hoverable lift effect
    - Test glassmorphism styling
    - _Requirements: 14.2_

- [ ] 5. Checkpoint - Verify design system foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Build prototype homepage (IndexRevamped)
  - [ ] 6.1 Create IndexRevamped component and route
    - Create src/pages/IndexRevamped.tsx
    - Add route to router configuration (/prototype or /index-revamped)
    - Set up basic page structure
    - _Requirements: 5.1, 5.6_
  
  - [ ] 6.2 Implement hero section
    - Create full viewport height hero section
    - Add ParticleBackground or gradient background
    - Add TypeWriter component for main title
    - Add fade-in subtitle with delay
    - Add two CTA buttons (primary and secondary)
    - Add scroll indicator with bounce animation
    - _Requirements: 4.1, 4.2, 5.2_
  
  - [ ] 6.3 Implement features section
    - Create section title with scroll reveal
    - Create 3-column responsive grid (1 col mobile, 3 col desktop)
    - Create feature cards with icons, titles, descriptions
    - Add scroll-triggered stagger animation
    - Add icon hover animations (rotate 360deg)
    - _Requirements: 4.4, 5.3_
  
  - [ ] 6.4 Implement showcase section
    - Create section title
    - Create product grid (horizontal scroll on mobile, 3-col grid on desktop)
    - Use existing product card component with hover effects
    - Add "View All" button at bottom
    - _Requirements: 5.3_
  
  - [ ] 6.5 Implement CTA section
    - Create centered content with gradient background
    - Add title and description
    - Add large primary button
    - Add interactive particle background
    - _Requirements: 5.2_
  
  - [ ]* 6.6 Write unit tests for prototype page structure
    - Verify hero section renders
    - Verify feature sections render
    - Verify CTA section renders
    - Verify route is accessible
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [ ] 7. Checkpoint - Review prototype with stakeholder
  - Ensure all tests pass, ask the user if questions arise.
  - User should review /prototype route and approve design direction before proceeding.

- [ ] 8. Redesign Community Forums
  - [ ] 8.1 Update forum layout and container
    - Set max-width to 1200px and center container
    - Create sidebar navigation (collapsible on mobile)
    - Update thread list to use card-based layout
    - _Requirements: 6.1, 6.2_
  
  - [ ] 8.2 Create ThreadCard component
    - Display title, author avatar, preview text
    - Display reply count, view count, last activity
    - Show pinned and locked indicators
    - Show tags with accent colors
    - Add hover lift effect
    - Add fade-in animation on load with stagger
    - _Requirements: 6.2, 6.4_
  
  - [ ] 8.3 Implement forum navigation transitions
    - Add smooth page transitions between threads and categories
    - Use fade or slide animations
    - _Requirements: 6.3_
  
  - [ ] 8.4 Update forum typography
    - Ensure font sizes are at least 14px for body text
    - Set line-height to at least 1.5
    - Apply design system typography tokens
    - _Requirements: 6.6_
  
  - [ ]* 8.5 Write property test for forum navigation transitions
    - **Property 15: Forum navigation transitions**
    - **Validates: Requirements 6.3**
  
  - [ ]* 8.6 Write unit tests for ThreadCard component
    - Test rendering with various props
    - Test hover effects
    - Test pinned/locked indicators
    - _Requirements: 6.2, 6.4_

- [ ] 9. Redesign Shop and Marketplace
  - [ ] 9.1 Update shop layout
    - Create filter sidebar (collapsible on mobile)
    - Create responsive product grid (2/3/4 columns)
    - Add sort dropdown with smooth transitions
    - Add search bar
    - _Requirements: 7.1_
  
  - [ ] 9.2 Enhance product card hover effects
    - Add card lift on hover (translateY: -8px)
    - Add shadow increase on hover
    - Add image scale on hover (scale: 1.05)
    - Add "Quick View" button fade-in on hover
    - Add creator avatar slide-up on hover
    - _Requirements: 7.2_
  
  - [ ] 9.3 Implement filter and sort animations
    - Fade out current products when filter changes
    - Fade in new products with stagger
    - Show skeleton loaders during loading
    - _Requirements: 7.3, 7.6_
  
  - [ ] 9.4 Create empty state component
    - Display illustration or icon
    - Show "No products found" message
    - Suggest actions (clear filters, browse all)
    - Add fade-in animation
    - _Requirements: 7.6_
  
  - [ ]* 9.5 Write property test for product card hover reveal
    - **Property 10: Product card hover reveal**
    - **Validates: Requirements 7.2**
  
  - [ ]* 9.6 Write property test for filter transition animations
    - **Property 11: Filter transition animations**
    - **Validates: Requirements 7.3**
  
  - [ ]* 9.7 Write property test for loading state animations
    - **Property 12: Loading state animations**
    - **Validates: Requirements 7.6**

- [ ] 10. Redesign Product Detail Page
  - [ ] 10.1 Update page layout
    - Create two-column layout (desktop): image gallery left, details right
    - Create single column layout (mobile): gallery top, details below
    - Make purchase section sticky on scroll
    - _Requirements: 18.3_
  
  - [ ] 10.2 Implement image gallery
    - Create main image with zoom on hover
    - Create thumbnail strip below main image
    - Add smooth transition when clicking thumbnails
    - Add lightbox mode for full-screen gallery
    - _Requirements: 7.4, 18.1_
  
  - [ ] 10.3 Update details section
    - Display product title, creator info, price
    - Add expandable description with "Read More"
    - Display feature list with checkmark icons
    - Display tags with accent colors
    - Add prominent purchase button (sticky on mobile)
    - _Requirements: 18.5_
  
  - [ ] 10.4 Add scroll-triggered reveals for detail sections
    - Fade in sections as user scrolls
    - Use ScrollReveal component
    - _Requirements: 18.4, 18.6_
  
  - [ ]* 10.5 Write property test for product image interaction transitions
    - **Property 20: Product image interaction transitions**
    - **Validates: Requirements 18.2**
  
  - [ ]* 10.6 Write unit tests for image gallery
    - Test thumbnail navigation
    - Test zoom functionality
    - Test lightbox mode
    - _Requirements: 7.4, 18.1_

- [ ] 11. Checkpoint - Verify marketplace and product pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Redesign Dashboard
  - [ ] 12.1 Update dashboard layout
    - Create sidebar navigation (persistent on desktop, drawer on mobile)
    - Create responsive card grid (1/2/3 columns)
    - Apply consistent spacing and shadows
    - _Requirements: 8.3_
  
  - [ ] 12.2 Create StatCard component
    - Display label, value, change indicator
    - Display icon and optional sparkline
    - Add count-up animation for numbers on mount
    - Add hover scale and shadow increase
    - _Requirements: 8.4_
  
  - [ ] 12.3 Integrate chart components
    - Add area chart for revenue with gradient fill
    - Add bar chart for sales with hover tooltips
    - Add line chart for traffic
    - Animate charts on mount with draw effect
    - Animate chart transitions on data updates
    - _Requirements: 8.1, 8.2_
  
  - [ ] 12.4 Implement chart tooltips
    - Display detailed information on hover
    - Show tooltip within 100ms of hover
    - _Requirements: 8.5_
  
  - [ ]* 12.5 Write property test for chart data update transitions
    - **Property 13: Chart data update transitions**
    - **Validates: Requirements 8.2**
  
  - [ ]* 12.6 Write property test for chart tooltip display
    - **Property 14: Chart tooltip display**
    - **Validates: Requirements 8.5**
  
  - [ ]* 12.7 Write unit tests for StatCard component
    - Test rendering with various props
    - Test count-up animation
    - Test hover effects
    - _Requirements: 8.4_

- [ ] 13. Redesign About Page
  - [ ] 13.1 Create page structure with sections
    - Create hero section with mission statement
    - Create timeline section for company milestones
    - Create team section with member grid
    - Create values section with icon cards
    - Create CTA section
    - _Requirements: 16.3, 16.5_
  
  - [ ] 13.2 Implement timeline component
    - Display events with year, title, description, optional image
    - Add scroll-triggered reveals for each event
    - Draw connecting line between events as they reveal
    - _Requirements: 16.3_
  
  - [ ] 13.3 Implement team member grid
    - Display team members with avatars, names, roles
    - Add hover effects (card lift, info reveal)
    - Use responsive grid layout
    - _Requirements: 16.3, 16.5_
  
  - [ ] 13.4 Add sequential scroll reveals
    - Ensure sections reveal in order as user scrolls
    - Each section starts animation after previous begins
    - _Requirements: 16.1, 16.2_
  
  - [ ]* 13.5 Write property test for sequential reveals
    - **Property 21: About page sequential reveals**
    - **Validates: Requirements 16.2**
  
  - [ ]* 13.6 Write unit tests for timeline component
    - Test rendering with events
    - Test scroll-triggered reveals
    - Test connecting line drawing
    - _Requirements: 16.3_

- [ ] 14. Redesign Creator Profile and Store Pages
  - [ ] 14.1 Update creator profile header
    - Add cover image with parallax scroll effect
    - Display avatar with border and shadow
    - Display creator name, bio, social links
    - Add follow button with loading state
    - _Requirements: 15.1_
  
  - [ ] 14.2 Update store page layout
    - Use same product grid as marketplace
    - Add "Featured" section at top
    - Add category tabs with smooth transitions
    - Add load more button with loading animation
    - _Requirements: 15.2, 15.6_
  
  - [ ] 14.3 Implement store customization UI
    - Add theme color picker
    - Add banner image upload with preview
    - Add bio editor with character count
    - Add social links manager
    - _Requirements: 15.4_
  
  - [ ] 14.4 Add creator statistics display
    - Display total sales, downloads, followers
    - Use StatCard component for visual emphasis
    - _Requirements: 15.5_
  
  - [ ]* 14.5 Write unit tests for creator profile header
    - Test rendering with creator data
    - Test parallax scroll effect
    - Test follow button states
    - _Requirements: 15.1_

- [ ] 15. Implement responsive design and accessibility
  - [ ] 15.1 Add responsive breakpoint handling
    - Ensure all components adapt at breakpoints (640px, 768px, 1024px)
    - Test layouts at mobile, tablet, desktop sizes
    - _Requirements: 9.1_
  
  - [ ] 15.2 Implement responsive typography and spacing
    - Adjust font sizes at breakpoints
    - Adjust spacing values at breakpoints
    - Use design system responsive tokens
    - _Requirements: 9.2_
  
  - [ ] 15.3 Ensure touch-friendly sizing on mobile
    - Verify all interactive elements are at least 44x44px on mobile
    - Increase button padding on mobile if needed
    - _Requirements: 9.4_
  
  - [ ] 15.4 Simplify animations on mobile
    - Reduce particle counts on mobile viewports
    - Disable complex blur effects on mobile
    - Use simpler animation variants on mobile
    - _Requirements: 9.5, 12.5_
  
  - [ ] 15.5 Implement accessibility features
    - Verify proper heading hierarchy on all pages
    - Add ARIA labels to complex components
    - Ensure keyboard navigation works for all interactive elements
    - Add visible focus indicators
    - Add alt text to all meaningful images
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  
  - [ ] 15.6 Verify color contrast compliance
    - Check all text/background combinations meet 4.5:1 ratio
    - Adjust colors if needed to meet WCAG standards
    - _Requirements: 10.2_
  
  - [ ]* 15.7 Write property test for viewport-based layout adaptation
    - **Property 22: Viewport-based layout adaptation**
    - **Validates: Requirements 9.1**
  
  - [ ]* 15.8 Write property test for responsive typography and spacing
    - **Property 23: Responsive typography and spacing**
    - **Validates: Requirements 9.2**
  
  - [ ]* 15.9 Write property test for touch target sizing
    - **Property 24: Touch target sizing**
    - **Validates: Requirements 9.4**
  
  - [ ]* 15.10 Write property test for mobile animation simplification
    - **Property 25: Mobile animation simplification**
    - **Validates: Requirements 9.5**
  
  - [ ]* 15.11 Write property test for heading hierarchy compliance
    - **Property 26: Heading hierarchy compliance**
    - **Validates: Requirements 10.1**
  
  - [ ]* 15.12 Write property test for color contrast compliance
    - **Property 27: Color contrast compliance**
    - **Validates: Requirements 10.2**
  
  - [ ]* 15.13 Write property test for keyboard navigation support
    - **Property 28: Keyboard navigation support**
    - **Validates: Requirements 10.3**
  
  - [ ]* 15.14 Write property test for image alt text presence
    - **Property 29: Image alt text presence**
    - **Validates: Requirements 10.4**
  
  - [ ]* 15.15 Write property test for ARIA label presence
    - **Property 30: ARIA label presence**
    - **Validates: Requirements 10.5**

- [ ] 16. Optimize performance
  - [ ] 16.1 Implement code splitting
    - Use React.lazy() for route-based code splitting
    - Split large components into separate chunks
    - Verify chunks are created in build output
    - _Requirements: 11.2_
  
  - [ ] 16.2 Optimize bundle size
    - Remove unused dependencies
    - Configure tree-shaking
    - Verify main bundle is under 200KB gzipped
    - Verify route chunks are under 100KB each
    - _Requirements: 11.5_
  
  - [ ] 16.3 Implement lazy loading for images
    - Use loading="lazy" attribute on images
    - Implement lazy loading for heavy components
    - Verify images load only when approaching viewport
    - _Requirements: 2.6, 11.3_
  
  - [ ] 16.4 Optimize animation performance
    - Use transform and opacity for animations (GPU-accelerated)
    - Add will-change sparingly for critical animations
    - Debounce scroll event handlers
    - Pause animations when tab is inactive
    - _Requirements: 1.4, 11.4_
  
  - [ ]* 16.5 Write unit tests for code splitting configuration
    - Verify React.lazy is used for routes
    - Verify dynamic imports are present
    - _Requirements: 11.2_
  
  - [ ]* 16.6 Write unit tests for bundle size limits
    - Verify bundle sizes are within limits
    - Alert if sizes exceed thresholds
    - _Requirements: 11.5_

- [ ] 17. Implement micro-interactions and polish
  - [ ] 17.1 Add form submission feedback
    - Display animated success messages
    - Display animated error messages
    - Show within 200ms of submission completion
    - _Requirements: 17.4_
  
  - [ ] 17.2 Add cursor indication for interactive elements
    - Set cursor: pointer on all interactive elements
    - Use appropriate cursors (grab, zoom, etc.) where relevant
    - _Requirements: 17.5_
  
  - [ ] 17.3 Implement route transition animations
    - Add fade or slide animations between pages
    - Ensure transitions complete before new page is visible
    - _Requirements: 17.6_
  
  - [ ] 17.4 Create loading state components
    - Create Spinner component with animation
    - Create SkeletonCard component with shimmer
    - Create SkeletonText component
    - _Requirements: 17.3_
  
  - [ ]* 17.5 Write property test for form submission feedback
    - **Property 17: Form submission feedback**
    - **Validates: Requirements 17.4**
  
  - [ ]* 17.6 Write property test for cursor indication
    - **Property 18: Cursor indication**
    - **Validates: Requirements 17.5**
  
  - [ ]* 17.7 Write property test for route transition animations
    - **Property 19: Route transition animations**
    - **Validates: Requirements 17.6**

- [ ] 18. Final checkpoint and testing
  - [ ] 18.1 Run full test suite
    - Run all unit tests
    - Run all property tests (minimum 100 iterations each)
    - Verify all tests pass
    - _Requirements: All_
  
  - [ ] 18.2 Run Lighthouse audits
    - Run Lighthouse on all major pages
    - Verify performance score is 90+ on desktop
    - Address any issues found
    - _Requirements: 11.1_
  
  - [ ] 18.3 Run accessibility audits
    - Run axe-core or similar scanner
    - Verify WCAG 2.1 AA compliance
    - Test with keyboard navigation
    - Test with screen reader
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 18.4 Test cross-browser compatibility
    - Test in Chrome, Firefox, Safari, Edge
    - Verify animations work consistently
    - Verify layouts are correct
    - _Requirements: 9.6_
  
  - [ ] 18.5 Test responsive behavior
    - Test on mobile devices (320px+)
    - Test on tablets (768px+)
    - Test on desktop (1024px+)
    - Verify touch interactions work on mobile
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 19. Final checkpoint - Complete
  - Ensure all tests pass, ask the user if questions arise.
  - All pages redesigned with modern animations and interactions.
  - Design system established and documented.
  - Performance optimized (90+ Lighthouse score).
  - Accessibility compliant (WCAG 2.1 AA).
  - Ready for production deployment.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The prototype homepage (task 6-7) should be reviewed and approved before proceeding with full redesign
- All animation components respect reduced motion preferences
- All components use design system tokens for consistency
- Performance is monitored throughout implementation
