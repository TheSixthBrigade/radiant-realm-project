# Design Document: Multi-Roadmap Dashboard

## Overview

This design implements a multi-roadmap system where Pro users can have multiple roadmaps (one per product). The `/roadmap` route displays a stylish dashboard with preview cards for each product roadmap, allowing visitors to click and expand into the full roadmap view.

## Architecture

The system extends the existing roadmap infrastructure:

```
/site/:slug/roadmap          → RoadmapDashboard (list of product roadmaps)
/site/:slug/roadmap/:productId → RoadmapPage (specific product roadmap)
```

### Data Flow

1. User visits `/roadmap`
2. System fetches all products with associated roadmap data
3. Dashboard renders preview cards with stats
4. User clicks card → navigates to full roadmap view
5. Back button returns to dashboard

## Components and Interfaces

### Database Schema Updates

```sql
-- Add product_id to roadmap_versions to associate with products
ALTER TABLE roadmap_versions ADD COLUMN product_id UUID REFERENCES products(id);

-- Add roadmap_enabled flag to products
ALTER TABLE products ADD COLUMN roadmap_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN roadmap_settings JSONB DEFAULT '{}';
```

### TypeScript Interfaces

```typescript
interface ProductRoadmap {
  product_id: string;
  product_name: string;
  product_image: string;
  product_description: string;
  current_version: string;
  total_versions: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  roadmap_settings: RoadmapSettings;
}

interface RoadmapDashboardProps {
  creatorId: string;
  isOwner: boolean;
  storeName?: string;
  storeLogo?: string;
  onSelectRoadmap: (productId: string) => void;
}
```

### RoadmapDashboard Component

```typescript
// Main dashboard component showing all product roadmaps
const RoadmapDashboard = ({ creatorId, isOwner, storeName, onSelectRoadmap }) => {
  const [productRoadmaps, setProductRoadmaps] = useState<ProductRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch all products with roadmap data
  // Render grid of RoadmapPreviewCards
  // Handle empty state
  // Owner: show "Enable Roadmap" for products without one
}
```

### RoadmapPreviewCard Component

```typescript
interface RoadmapPreviewCardProps {
  roadmap: ProductRoadmap;
  onClick: () => void;
  isOwner: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
}

// Visual card with:
// - Product image with gradient overlay
// - Product name
// - Current version badge
// - Progress stats (X/Y tasks completed)
// - Progress bar
// - "View Roadmap" button
```

## Data Models

### ProductRoadmap Query

```sql
SELECT 
  p.id as product_id,
  p.title as product_name,
  p.image_url as product_image,
  p.description as product_description,
  p.roadmap_settings,
  (SELECT version_name FROM roadmap_versions 
   WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as current_version,
  (SELECT COUNT(*) FROM roadmap_versions WHERE product_id = p.id) as total_versions,
  (SELECT COUNT(*) FROM roadmap_items ri 
   JOIN roadmap_versions rv ON ri.version_id = rv.id 
   WHERE rv.product_id = p.id) as total_tasks,
  (SELECT COUNT(*) FROM roadmap_items ri 
   JOIN roadmap_versions rv ON ri.version_id = rv.id 
   WHERE rv.product_id = p.id AND ri.status = 'completed') as completed_tasks
FROM products p
WHERE p.creator_id = $1 AND p.roadmap_enabled = true
```

## UI Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                              [Suggest Feature]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ✨ Product Roadmaps ✨                         │
│           Track our development progress                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  [Image]    │  │  [Image]    │  │  [Image]    │         │
│  │             │  │             │  │             │         │
│  │ Product A   │  │ Product B   │  │ Product C   │         │
│  │ v2.1.0      │  │ v1.0.0      │  │ v3.2.0      │         │
│  │ ████░░ 75%  │  │ ██░░░░ 30%  │  │ █████░ 90%  │         │
│  │ 12/16 tasks │  │ 3/10 tasks  │  │ 18/20 tasks │         │
│  │             │  │             │  │             │         │
│  │ [View →]    │  │ [View →]    │  │ [View →]    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  + Enable Roadmap for "Product D"  (Owner only)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Design (Kinetic Style)

- Glass-morphism background with `backdrop-blur-xl`
- Gradient border matching product category or custom color
- Product image at top with dark gradient overlay
- Version badge with glow effect
- Animated progress bar
- Hover: scale(1.02), increased glow, border brightness

### Color Scheme

```css
/* Card backgrounds */
--card-bg: rgba(30, 41, 59, 0.6);
--card-border: rgba(59, 130, 246, 0.3);
--card-hover-border: rgba(59, 130, 246, 0.6);

/* Progress bar colors */
--progress-bg: rgba(255, 255, 255, 0.1);
--progress-fill: linear-gradient(90deg, #3b82f6, #8b5cf6);

/* Text */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Dashboard Shows All Enabled Roadmaps
*For any* store with N products that have `roadmap_enabled = true`, the dashboard SHALL display exactly N roadmap cards.
**Validates: Requirements 1.1**

### Property 2: Task Count Accuracy
*For any* product roadmap, the displayed task count SHALL equal the sum of all tasks across all versions for that product.
**Validates: Requirements 1.2**

### Property 3: Completion Percentage Calculation
*For any* product roadmap, the completion percentage SHALL equal `(completed_tasks / total_tasks) * 100`, rounded to nearest integer.
**Validates: Requirements 1.2**

### Property 4: Navigation Consistency
*For any* roadmap card click, the system SHALL navigate to the correct product's roadmap view and display that product's data.
**Validates: Requirements 1.3, 4.2**

## Error Handling

| Error | Handling |
|-------|----------|
| No products with roadmaps | Show empty state with "Create your first roadmap" CTA |
| Product not found | Redirect to dashboard with toast error |
| Database error | Show error state with retry button |
| Unauthorized access | Show Pro upgrade prompt |

## Testing Strategy

### Unit Tests
- RoadmapPreviewCard renders correctly with all props
- Progress calculation is accurate
- Empty state displays when no roadmaps

### Property Tests
- Task count aggregation across versions
- Completion percentage calculation
- Card count matches enabled products

### Integration Tests
- Dashboard fetches and displays all roadmaps
- Click navigation works correctly
- Owner controls function properly
