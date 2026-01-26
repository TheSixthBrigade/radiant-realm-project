# Vectabase Website Revamp - Complete Redesign Spec

## Overview
Complete redesign of Vectabase platform focusing on FUNCTIONALITY over aesthetics. Clean, modern design inspired by Supabase and ClearlyDev with emphasis on usability and performance.

## Design System

### Color Scheme (Keep Current)
- **Primary**: Green (#22c55e, #16a34a)
- **Background**: Black/Dark Gray (#0a0a0a, #1a1a1a)
- **Surface**: Gray (#262626, #333333)
- **Text**: White (#ffffff), Gray (#a3a3a3)
- **Accent**: Green glow effects

### Typography (Supabase-inspired)
- **Headings**: `font-family: 'Inter', system-ui, sans-serif`
- **Body**: `font-family: 'Inter', system-ui, sans-serif`
- **Code/Data**: `font-family: 'JetBrains Mono', 'Fira Code', monospace`
- **Sizes**:
  - Hero: 3.5rem (56px) - Bold
  - H1: 2.5rem (40px) - Bold
  - H2: 2rem (32px) - Semibold
  - H3: 1.5rem (24px) - Semibold
  - Body: 1rem (16px) - Regular
  - Small: 0.875rem (14px) - Regular

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px

### Components
- Rounded corners: 8px (buttons), 12px (cards), 16px (modals)
- Shadows: Subtle, green-tinted glows for interactive elements
- Borders: 1px solid rgba(255,255,255,0.1)

---

## Page-by-Page Specifications

### 1. Homepage (`/`)

#### Hero Section
- **Layout**: Full-width, centered content
- **Content**:
  - Main headline: "Build. Sell. Scale." (3.5rem, bold)
  - Subheadline: "The Roblox developer marketplace for scripts, assets, and tools" (1.25rem)
  - Two CTAs: "Browse Marketplace" (primary green), "Start Selling" (secondary outline)
  - Live stats bar: Total Sales, Active Sellers, Products Listed (animated counters)
- **Background**: Animated gradient canvas (subtle, not distracting)

#### Features Grid
- **Layout**: 3-column grid (responsive to 1 column on mobile)
- **Features**:
  1. **Instant Payments** - Stripe Connect integration, get paid immediately
  2. **Developer Tools** - API access, Discord bot, whitelist management
  3. **Analytics Dashboard** - Track sales, downloads, revenue in real-time
  4. **Secure Transactions** - Encrypted data, secure payments, buyer protection
  5. **Custom Storefronts** - Build your brand with customizable store pages
  6. **Community Features** - Forums, roadmaps, announcements
- **Style**: Icon + Title + Description, hover effect with green glow

#### Product Showcase
- **Layout**: Horizontal scrolling carousel
- **Content**: "Featured Products" - 8-10 products
- **Card Design**:
  - Product image (16:9 ratio)
  - Title (truncate at 2 lines)
  - Price (bold, green)
  - Seller name + avatar
  - Quick actions: Add to cart, View details
- **Style**: Clean cards with hover lift effect

#### Stats Section
- **Layout**: Full-width, dark background
- **Content**: 4 key metrics in large numbers
  - Total Revenue Processed
  - Active Developers
  - Products Available
  - Average Rating
- **Style**: Monospace font for numbers, animated count-up on scroll

#### CTA Section
- **Layout**: Centered, full-width
- **Content**: "Ready to start selling?" + CTA button
- **Style**: Green gradient background, bold text

---

### 2. Shop/Marketplace (`/shop`)

#### Header
- **Search Bar**: Full-width, prominent, with filters button
- **Filters**: Category, Price range, Rating, Sort by
- **View Toggle**: Grid view / List view

#### Product Grid
- **Layout**: 4-column grid (responsive)
- **Card Design** (Enhanced):
  - Image with category badge overlay
  - Title (1 line, ellipsis)
  - Seller info (avatar + name)
  - Price (bold, green)
  - Rating stars + review count
  - Quick view button (hover)
- **Pagination**: Load more button + page numbers

#### Sidebar Filters (Desktop)
- Categories (tree structure)
- Price range slider
- Rating filter
- Seller filter
- Tags/Keywords

#### Empty State
- Illustration + "No products found"
- Suggestions or popular products

---

### 3. Product Detail (`/product/:id`)

#### Layout: 2-Column

**Left Column (60%)**:
- **Image Gallery**: Main image + thumbnails, lightbox on click
- **Description**: Rich text, formatted nicely
- **Features List**: Bullet points
- **Changelog**: Version history (if applicable)
- **Reviews Section**: Star rating + written reviews

**Right Column (40%, Sticky)**:
- **Product Info Card**:
  - Title (H1)
  - Seller info (avatar, name, rating, link to store)
  - Price (large, bold, green)
  - Purchase button (primary, full-width)
  - Add to cart button (secondary)
  - License info
  - File size, version, last updated
- **Seller Stats**: Total sales, rating, response time
- **Related Products**: 3-4 similar items

---

### 4. Dashboard (`/dashboard`)

#### Layout: Sidebar + Main Content

**Sidebar Navigation**:
- Overview
- Products
- Sales
- Analytics
- Store Settings
- Payouts
- API Keys

**Overview Page**:
- **Stats Cards** (4-column grid):
  - Total Revenue (this month)
  - Total Sales (this month)
  - Active Products
  - Avg. Rating
- **Revenue Chart**: Line chart, last 30 days
- **Recent Sales Table**: Last 10 transactions
- **Top Products**: Bar chart or list
- **Quick Actions**: Add Product, View Store, Manage Payouts

**Products Page**:
- **Table View**: Image, Title, Price, Sales, Status, Actions
- **Actions**: Edit, Delete, Duplicate, View
- **Bulk Actions**: Delete, Change status
- **Add Product Button**: Prominent, top-right

**Sales Page**:
- **Filters**: Date range, Product, Status
- **Table**: Date, Product, Buyer, Amount, Status
- **Export**: CSV download

**Analytics Page**:
- **Revenue Chart**: Multiple time ranges
- **Sales by Product**: Pie chart
- **Geographic Data**: Map or list
- **Traffic Sources**: Bar chart
- **Conversion Rate**: Metric card

---

### 5. Developer Portal (`/developer`)

#### Layout: Tabs

**API Documentation Tab**:
- **Sidebar**: Endpoints list
- **Main Content**: 
  - Endpoint details
  - Request/Response examples (code blocks)
  - Try it out (interactive)
- **Style**: Supabase-style docs, monospace for code

**Bot Dashboard Tab**:
- **Discord Server List**: Cards with server info
- **Bot Configuration**: Per-server settings
- **Whitelist Management**: Table with search/filter
- **Commands**: List of available commands

**API Keys Tab**:
- **Key Management**: Create, revoke, view usage
- **Usage Stats**: Requests per day chart
- **Rate Limits**: Current usage vs limits

**Obfuscator Tab**:
- **Upload Script**: Drag-drop or file picker
- **Obfuscation Options**: Checkboxes for features
- **Download**: Obfuscated script
- **Credits**: Balance + purchase more

---

### 6. Store Page (`/store/:username`)

#### Header
- **Store Banner**: Custom image or gradient
- **Store Info**:
  - Store name (H1)
  - Seller avatar (large)
  - Bio/Description
  - Social links
  - Follow button
  - Stats: Products, Sales, Rating

#### Products Section
- **Grid**: Same as marketplace
- **Filters**: Category, Price, Sort
- **Search**: Within store

#### About Section
- **Rich Text**: Store description, policies
- **Contact**: Email, Discord, etc.

---

### 7. Auth Pages (`/auth`)

#### Layout: Centered Card

**Login**:
- Email + Password fields
- "Remember me" checkbox
- Login button (primary)
- "Forgot password?" link
- Divider
- "Sign in with Discord" button (secondary)
- "Don't have an account? Sign up" link

**Register**:
- Email, Username, Password fields
- "I agree to Terms" checkbox
- Register button (primary)
- "Sign up with Discord" button (secondary)
- "Already have an account? Login" link

**Style**: Clean, minimal, focus on form

---

### 8. Checkout (`/checkout`)

#### Layout: 2-Column

**Left Column (60%)**:
- **Order Summary**: Product details, price
- **Payment Method**: Stripe Elements
- **Billing Info**: Form fields

**Right Column (40%, Sticky)**:
- **Order Total Card**:
  - Subtotal
  - Platform fee (10%)
  - Total (bold, large)
  - Secure checkout badge
  - Complete purchase button

---

## Technical Implementation

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: shadcn/ui (customized)
- **State**: React Context + Hooks
- **Data**: Supabase (PostgreSQL + Realtime)
- **Payments**: Stripe Connect
- **Animations**: Framer Motion (subtle)

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Page Load Time**: < 2s (all pages)
- **Forum Load Time**: < 1.5s (critical - currently slow)

### Performance Optimization Priorities
1. **Forums (CRITICAL)**: Lazy loading, pagination, virtual scrolling
2. **Product Images**: WebP format, lazy loading, responsive images
3. **Database Queries**: Indexed queries, connection pooling, caching
4. **Bundle Size**: Code splitting, tree shaking, dynamic imports
5. **API Calls**: Debouncing, caching, optimistic updates

### Accessibility
- **WCAG 2.1 Level AA** compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- Alt text for images

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Wide: > 1536px

---

## Implementation Phases

### Phase 1: Design System & Core Components (Week 1)
- [ ] Set up typography (Inter + JetBrains Mono)
- [ ] Create design tokens (colors, spacing, shadows)
- [ ] Build base components (Button, Card, Input, etc.)
- [ ] Set up layout components (Container, Grid, Stack)

### Phase 2: Homepage (Week 1-2)
- [ ] Hero section with animated background
- [ ] Features grid
- [ ] Product showcase carousel
- [ ] Stats section with animations
- [ ] Footer

### Phase 3: Marketplace (Week 2)
- [ ] Product grid with filters
- [ ] Search functionality
- [ ] Sidebar filters
- [ ] Product cards (enhanced)
- [ ] Pagination

### Phase 4: Product Detail (Week 2-3)
- [ ] Image gallery
- [ ] Product info sidebar
- [ ] Reviews section
- [ ] Related products
- [ ] Purchase flow

### Phase 5: Dashboard (Week 3-4)
- [ ] Sidebar navigation
- [ ] Overview page with charts
- [ ] Products management
- [ ] Sales table
- [ ] Analytics page

### Phase 6: Developer Portal (Week 4)
- [ ] API documentation (with code syntax highlighting)
- [ ] Bot dashboard (optimized queries)
- [ ] API keys management
- [ ] Obfuscator interface (with progress indicators)

### Phase 7: Store Pages & Forums (Week 5)
- [ ] Store header/banner (optimized images)
- [ ] Product grid (lazy loading)
- [ ] About section
- [ ] Customization options
- [ ] **Forums optimization** (CRITICAL):
  - [ ] Virtual scrolling for long threads
  - [ ] Pagination (20 posts per page)
  - [ ] Lazy load images/media
  - [ ] Debounced search
  - [ ] Cached queries (5min TTL)
  - [ ] Optimistic UI updates

### Phase 8: Auth & Checkout (Week 5)
- [ ] Login/Register pages
- [ ] Checkout flow
- [ ] Payment integration
- [ ] Success/Failure pages

### Phase 9: Polish & Optimization (Week 6)
- [ ] **Performance optimization** (ALL PAGES):
  - [ ] Image optimization (WebP, lazy loading)
  - [ ] Code splitting (route-based)
  - [ ] Database query optimization (indexes, caching)
  - [ ] Bundle size reduction (< 200KB initial)
  - [ ] API response caching (Redis/memory)
  - [ ] CDN for static assets
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile optimization (touch targets, viewport)
- [ ] Animation polish (60fps, reduced motion support)

---

## Success Metrics

### User Experience
- Reduced bounce rate by 30%
- Increased time on site by 50%
- Improved conversion rate by 25%

### Performance
- Page load time < 2s
- Lighthouse score > 90
- Zero critical accessibility issues

### Business
- Increased product listings by 40%
- Increased sales by 35%
- Improved seller satisfaction (survey)

---

## Performance Optimization Strategy

### Critical Performance Issues to Fix

#### 1. Forums (HIGHEST PRIORITY)
**Problem**: Forums loading slowly, especially with many posts
**Solutions**:
- Virtual scrolling (only render visible posts)
- Pagination (20 posts per page max)
- Lazy load images and media
- Database query optimization:
  - Add indexes on `forum_posts.created_at`, `forum_posts.thread_id`
  - Use `LIMIT` and `OFFSET` for pagination
  - Cache thread lists (5min TTL)
- Debounce search input (300ms)
- Optimistic UI updates (instant feedback)

#### 2. Product Images
**Problem**: Large images slow down page load
**Solutions**:
- Convert to WebP format (70% smaller)
- Implement lazy loading (`loading="lazy"`)
- Use responsive images (`srcset`)
- Compress images (80% quality)
- CDN for image delivery

#### 3. Database Queries
**Problem**: Slow queries on large tables
**Solutions**:
- Add indexes on frequently queried columns
- Use connection pooling (pg-pool)
- Implement query result caching (Redis or in-memory)
- Optimize JOIN queries
- Use `SELECT` specific columns (not `*`)

#### 4. Bundle Size
**Problem**: Large JavaScript bundle slows initial load
**Solutions**:
- Code splitting by route (React.lazy)
- Tree shaking (remove unused code)
- Dynamic imports for heavy components
- Minimize dependencies
- Target bundle size: < 200KB initial

#### 5. API Response Time
**Problem**: API calls taking too long
**Solutions**:
- Implement response caching (5-15min TTL)
- Use debouncing for search/filter
- Batch API requests where possible
- Add loading states for better UX
- Implement optimistic updates

### Performance Monitoring

**Tools to Use**:
- Lighthouse (Chrome DevTools)
- WebPageTest
- React DevTools Profiler
- Network tab (Chrome DevTools)
- Performance tab (Chrome DevTools)

**Metrics to Track**:
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3s
- Total Blocking Time (TBT) < 300ms
- Cumulative Layout Shift (CLS) < 0.1

### Database Optimization Checklist

```sql
-- Add indexes for forums
CREATE INDEX idx_forum_posts_thread_id ON forum_posts(thread_id);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX idx_forum_threads_created_at ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_product_id ON forum_threads(product_id);

-- Add indexes for products
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_creator_id ON products(creator_id);
CREATE INDEX idx_products_category ON products(category);

-- Add indexes for sales
CREATE INDEX idx_sales_seller_id ON sales(seller_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_product_id ON sales(product_id);
```

### Code Splitting Strategy

```typescript
// Route-based code splitting
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Forums = lazy(() => import('./pages/Forums')); // Heavy component

// Component-based code splitting
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
const ChartComponent = lazy(() => import('./components/ChartComponent'));
```

### Caching Strategy

**Client-Side (React Query)**:
- Product lists: 5min stale time
- User profile: 10min stale time
- Forum threads: 2min stale time
- Sales data: 1min stale time

**Server-Side (Redis/Memory)**:
- Product catalog: 15min TTL
- User sessions: 24hr TTL
- Forum thread lists: 5min TTL
- Analytics data: 1hr TTL

---

## Notes

- **Focus on FUNCTIONALITY**: Every element must serve a purpose
- **Clean & Minimal**: Remove unnecessary decorations
- **Fast & Responsive**: Optimize for performance
- **Accessible**: WCAG 2.1 AA compliance
- **Scalable**: Design system for future growth

---

## Design References

- **Supabase**: Typography, code blocks, documentation style
- **ClearlyDev**: Product cards, marketplace layout, dark theme
- **Stripe**: Checkout flow, payment UI
- **GitHub**: Dashboard layout, navigation patterns

---

## Next Steps

1. Review and approve this spec
2. Set up design system (typography, colors, components)
3. Start with Homepage implementation
4. Iterate based on feedback
5. Deploy incrementally (feature flags)

---

**Status**: ✅ Spec Complete - Ready for Implementation
**Last Updated**: 2026-01-15
**Owner**: Development Team
