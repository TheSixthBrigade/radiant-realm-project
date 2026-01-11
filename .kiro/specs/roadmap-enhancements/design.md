# Design Document: Roadmap Enhancements

## Overview

This design adds three major enhancements to the roadmap system:
1. **Descriptions** for version cards and tasks with easy inline editing
2. **Status timestamps** showing when items were last updated or completed
3. **Forum-style suggestion system** with discussion threads, replies, and creator responses

## Architecture

### Component Structure

```
RoadmapPage.tsx
├── FloatingOrb (background effects)
├── Header
├── VersionCard (enhanced)
│   ├── VersionHeader (with description)
│   ├── VersionDescription (editable)
│   └── TaskList
│       └── TaskItem (with timestamps, inline edit)
├── SuggestionForum (new)
│   ├── SuggestionList
│   │   ├── SuggestionCard (with reply count)
│   │   └── SortControls
│   └── SuggestionThread (new)
│       ├── OriginalPost
│       ├── ReplyList
│       │   └── ReplyItem (with creator badge)
│       └── ReplyForm
└── SuggestionModal (existing, enhanced)
```

### State Management

```typescript
// New state for forum
const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
const [suggestionReplies, setSuggestionReplies] = useState<Record<string, Reply[]>>({});
const [sortBy, setSortBy] = useState<'newest' | 'upvotes' | 'discussed'>('upvotes');

// Editing state
const [editingVersion, setEditingVersion] = useState<string | null>(null);
const [editingTask, setEditingTask] = useState<string | null>(null);
```

## Components and Interfaces

### Database Schema Changes

```sql
-- Add description to roadmap_versions
ALTER TABLE roadmap_versions 
ADD COLUMN description TEXT;

-- Add status_changed_at to roadmap_items
ALTER TABLE roadmap_items 
ADD COLUMN description TEXT,
ADD COLUMN status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Add status to roadmap_suggestions
ALTER TABLE roadmap_suggestions
ADD COLUMN status TEXT DEFAULT 'open',
ADD COLUMN status_changed_at TIMESTAMPTZ;

-- New table for suggestion replies
CREATE TABLE roadmap_suggestion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES roadmap_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient reply queries
CREATE INDEX idx_replies_suggestion ON roadmap_suggestion_replies(suggestion_id);
CREATE INDEX idx_replies_created ON roadmap_suggestion_replies(created_at);
```

### TypeScript Interfaces

```typescript
interface RoadmapVersion {
  id: string;
  creator_id: string;
  version_name: string;
  description?: string;  // NEW
  status: string;
  sort_order: number;
  is_expanded: boolean;
  items?: RoadmapItem[];
}

interface RoadmapItem {
  id: string;
  version_id: string;
  title: string;
  description?: string;
  status: string;
  sort_order: number;
  status_changed_at?: string;  // NEW
}

interface RoadmapSuggestion {
  id: string;
  creator_id: string;
  user_id: string;
  title: string;
  description?: string;
  upvotes: number;
  user_upvoted?: boolean;
  status?: 'open' | 'planned' | 'in_progress' | 'completed' | 'declined';  // NEW
  status_changed_at?: string;  // NEW
  reply_count?: number;  // NEW (computed)
  created_at: string;
  author?: {  // NEW (joined)
    username: string;
    avatar_url?: string;
  };
}

interface SuggestionReply {
  id: string;
  suggestion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    username: string;
    avatar_url?: string;
    is_creator: boolean;  // Computed: user_id === suggestion.creator_id
  };
}
```

## Data Models

### Version Description Flow

```
User clicks edit → Show textarea → User types → Blur/Enter → 
API call to update → Optimistic UI update → Confirm save
```

### Status Change Timestamp Flow

```
User changes status → Update status field → 
Set status_changed_at = NOW() → Save to DB → 
UI shows "Last updated X ago" or "Completed on X"
```

### Forum Thread Flow

```
User clicks suggestion card → Load replies for suggestion_id →
Display thread view → User can reply → 
Reply saved → Refresh replies → Update reply_count
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Description Persistence Round-Trip
*For any* version or task with a description, saving and then fetching should return the same description content.
**Validates: Requirements 1.3, 2.3**

### Property 2: Empty Description Hiding
*For any* version or task where description is null or empty string, the description UI element should not be rendered.
**Validates: Requirements 1.4**

### Property 3: Status Change Timestamp Recording
*For any* task status change, the status_changed_at field should be updated to a timestamp within 1 second of the change.
**Validates: Requirements 3.1, 3.4**

### Property 4: Completed Task Date Display
*For any* task with status "completed", the UI should display the completion date derived from status_changed_at.
**Validates: Requirements 3.2**

### Property 5: Reply Chronological Order
*For any* suggestion thread with multiple replies, replies should be ordered by created_at ascending (oldest first).
**Validates: Requirements 4.2**

### Property 6: Post Metadata Display
*For any* suggestion or reply, the rendered output should contain the author's username and a relative timestamp.
**Validates: Requirements 4.5, 4.6**

### Property 7: Creator Response Highlighting
*For any* reply where the author's user_id matches the suggestion's creator_id, the reply should be marked with a "Creator Response" indicator.
**Validates: Requirements 4.7**

### Property 8: Reply Count Accuracy
*For any* suggestion, the displayed reply_count should equal the actual count of replies in the database.
**Validates: Requirements 4.9**

### Property 9: Suggestion Sorting
*For any* sort option (newest, upvotes, discussed), the suggestion list should be correctly ordered by that criterion.
**Validates: Requirements 5.4**

### Property 10: Creator Status Controls
*For any* user who is the creator (isOwner=true), the suggestion status controls should be visible and functional.
**Validates: Requirements 5.5**

## Error Handling

### Database Errors
- Show toast notification on save failure
- Revert optimistic updates if save fails
- Retry logic for transient failures

### Empty States
- No replies: "Be the first to comment on this suggestion"
- No suggestions: "No suggestions yet. Be the first to suggest a feature!"

### Loading States
- Skeleton loaders for thread view
- Spinner for reply submission
- Optimistic UI for upvotes

## Testing Strategy

### Unit Tests
- Relative time formatting function
- Reply sorting logic
- Creator detection logic

### Property-Based Tests
- Description round-trip persistence
- Status timestamp recording
- Reply ordering
- Sorting correctness

### Integration Tests
- Full suggestion → reply → upvote flow
- Status change with timestamp update
- Description edit and save

