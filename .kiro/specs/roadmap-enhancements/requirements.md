# Requirements Document

## Introduction

Enhance the roadmap page with version descriptions, status timestamps, and a full forum-style suggestion system similar to DevForum or Discord forums.

## Glossary

- **Roadmap_System**: The roadmap page component and its associated database tables
- **Version_Card**: A collapsible card representing a version/release with tasks inside
- **Task_Item**: An individual task/feature within a version
- **Suggestion_Forum**: A forum-style system for community feature suggestions with threads and replies
- **Status_Timestamp**: A record of when an item's status was last changed

## Requirements

### Requirement 1: Version Card Descriptions

**User Story:** As a creator, I want to add descriptions to version cards, so that I can provide context about what each version/release contains.

#### Acceptance Criteria

1. WHEN a creator views a version card, THE Roadmap_System SHALL display an optional description field below the version title
2. WHEN a creator clicks an edit button on a version, THE Roadmap_System SHALL show an inline editor for the description
3. WHEN a creator saves a description, THE Roadmap_System SHALL persist it to the database immediately
4. WHEN a description is empty or null, THE Roadmap_System SHALL hide the description area cleanly
5. THE Roadmap_System SHALL support markdown or basic formatting in descriptions

### Requirement 2: Task Item Descriptions

**User Story:** As a creator, I want to easily add and edit descriptions for tasks, so that I can provide details about each feature.

#### Acceptance Criteria

1. WHEN a creator adds a new task, THE Roadmap_System SHALL provide an optional description field
2. WHEN a creator clicks on a task, THE Roadmap_System SHALL allow inline editing of title and description
3. WHEN editing is complete, THE Roadmap_System SHALL save changes automatically or on blur

### Requirement 3: Status Change Timestamps

**User Story:** As a user, I want to see when items were last updated or completed, so that I can track progress over time.

#### Acceptance Criteria

1. WHEN a task status changes, THE Roadmap_System SHALL record the timestamp of the change
2. WHEN a task is marked as completed, THE Roadmap_System SHALL display "Completed on [date]" 
3. WHEN viewing any task, THE Roadmap_System SHALL show "Last updated [relative time]" (e.g., "2 days ago")
4. THE Roadmap_System SHALL store status_changed_at timestamp in the database

### Requirement 4: Suggestion Forum System

**User Story:** As a user, I want a full forum-style system for suggestions, so that I can discuss feature ideas with the community like DevForum or Discord.

#### Acceptance Criteria

1. WHEN a user submits a suggestion, THE Suggestion_Forum SHALL create a discussion thread
2. WHEN viewing a suggestion, THE Suggestion_Forum SHALL display the original post and all replies in chronological order
3. WHEN a user clicks on a suggestion, THE Suggestion_Forum SHALL open a detailed thread view
4. WHEN viewing a thread, THE Suggestion_Forum SHALL allow authenticated users to post replies
5. THE Suggestion_Forum SHALL display author information (username, avatar) for each post
6. THE Suggestion_Forum SHALL show post timestamps with relative time formatting
7. WHEN a creator responds to a suggestion, THE Suggestion_Forum SHALL highlight their response as "Creator Response"
8. THE Suggestion_Forum SHALL maintain the upvote system on the main suggestion
9. THE Suggestion_Forum SHALL show reply count on suggestion cards in the list view
10. WHEN a suggestion has new replies, THE Suggestion_Forum SHALL indicate unread activity

### Requirement 5: Forum Navigation and UI

**User Story:** As a user, I want intuitive navigation between suggestion list and thread views, so that I can easily browse and participate in discussions.

#### Acceptance Criteria

1. THE Suggestion_Forum SHALL display suggestions in a card list with title, description preview, upvotes, and reply count
2. WHEN clicking a suggestion card, THE Suggestion_Forum SHALL navigate to the full thread view
3. THE Suggestion_Forum SHALL provide a back button to return to the suggestion list
4. THE Suggestion_Forum SHALL support sorting by: newest, most upvoted, most discussed
5. IF the creator is viewing, THE Suggestion_Forum SHALL allow marking suggestions as "Planned", "In Progress", "Completed", or "Declined"

