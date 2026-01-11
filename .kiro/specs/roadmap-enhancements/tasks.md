# Implementation Plan: Roadmap Enhancements

## Overview

Implement version/task descriptions, status timestamps, and a full forum-style suggestion system with discussion threads.

## Tasks

- [x] 1. Database schema updates
  - [x] 1.1 Create migration for roadmap_versions description column
    - Add `description TEXT` column to roadmap_versions table
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Create migration for roadmap_items enhancements
    - Add `description TEXT` column
    - Add `status_changed_at TIMESTAMPTZ DEFAULT NOW()` column
    - _Requirements: 2.1, 3.4_
  - [x] 1.3 Create migration for suggestion forum tables
    - Add `status TEXT DEFAULT 'open'` to roadmap_suggestions
    - Add `status_changed_at TIMESTAMPTZ` to roadmap_suggestions
    - Create `roadmap_suggestion_replies` table with id, suggestion_id, user_id, content, created_at, updated_at
    - Add indexes for efficient queries
    - _Requirements: 4.1, 4.2_

- [x] 2. Update TypeScript interfaces
  - [x] 2.1 Update RoadmapPage interfaces
    - Add description to RoadmapVersion and RoadmapItem
    - Add status_changed_at to RoadmapItem
    - Add status, reply_count, author to RoadmapSuggestion
    - Create SuggestionReply interface
    - _Requirements: 1.1, 3.1, 4.1_

- [x] 3. Implement version description feature
  - [x] 3.1 Add version description display
    - Show description below version title when present
    - Hide cleanly when empty/null
    - _Requirements: 1.1, 1.4_
  - [x] 3.2 Add inline editing for version description
    - Edit button for owners
    - Textarea with save/cancel
    - Auto-save on blur
    - _Requirements: 1.2, 1.3_

- [x] 4. Implement task enhancements
  - [x] 4.1 Add task description field to add task form
    - Optional description textarea when adding tasks
    - _Requirements: 2.1_
  - [x] 4.2 Add inline editing for tasks
    - Click to edit title and description
    - Save on blur/enter
    - _Requirements: 2.2, 2.3_
  - [x] 4.3 Implement status change timestamps
    - Update status_changed_at when status changes
    - Display "Last updated X ago" on all tasks
    - Display "Completed on [date]" for completed tasks
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Checkpoint - Test descriptions and timestamps
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement suggestion forum - data layer
  - [ ] 6.1 Create reply fetching function
    - Fetch replies for a suggestion with author info
    - Order by created_at ascending
    - _Requirements: 4.2, 4.5_
  - [ ] 6.2 Create reply submission function
    - Insert new reply with user_id and content
    - Return the created reply with author info
    - _Requirements: 4.4_
  - [ ] 6.3 Update suggestion fetching to include reply count
    - Add reply_count computed field
    - Join author info (username, avatar)
    - _Requirements: 4.9, 5.1_

- [ ] 7. Implement suggestion forum - UI components
  - [ ] 7.1 Create SuggestionCard component
    - Display title, description preview, upvotes, reply count
    - Click to open thread
    - _Requirements: 5.1, 5.2_
  - [ ] 7.2 Create SuggestionThread component
    - Original post display with full description
    - Reply list with author info and timestamps
    - Creator response highlighting
    - Back button to list
    - _Requirements: 4.2, 4.3, 4.7, 5.3_
  - [ ] 7.3 Create ReplyForm component
    - Textarea for reply content
    - Submit button with loading state
    - Only show for authenticated users
    - _Requirements: 4.4_
  - [ ] 7.4 Create ReplyItem component
    - Author avatar and username
    - Relative timestamp
    - "Creator Response" badge when applicable
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 8. Implement forum navigation and sorting
  - [ ] 8.1 Add sort controls to suggestion list
    - Dropdown/tabs for: Newest, Most Upvoted, Most Discussed
    - Persist sort preference
    - _Requirements: 5.4_
  - [ ] 8.2 Add suggestion status controls for creators
    - Status dropdown: Open, Planned, In Progress, Completed, Declined
    - Status badge display on cards
    - _Requirements: 5.5_
  - [ ] 8.3 Integrate forum into RoadmapPage
    - Toggle between list and thread view
    - State management for selected suggestion
    - _Requirements: 4.3, 5.2_

- [ ] 9. Checkpoint - Test forum functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 10. Property-based tests
  - [ ]* 10.1 Write property test for description persistence
    - **Property 1: Description Persistence Round-Trip**
    - **Validates: Requirements 1.3, 2.3**
  - [ ]* 10.2 Write property test for status timestamp recording
    - **Property 3: Status Change Timestamp Recording**
    - **Validates: Requirements 3.1, 3.4**
  - [ ]* 10.3 Write property test for reply ordering
    - **Property 5: Reply Chronological Order**
    - **Validates: Requirements 4.2**
  - [ ]* 10.4 Write property test for suggestion sorting
    - **Property 9: Suggestion Sorting**
    - **Validates: Requirements 5.4**

- [ ] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Forum system is the largest piece - can be split into phases if needed

