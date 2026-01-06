# Bot Dashboard - Implementation Tasks

## Task 1: Apply Database Migration
**Requirement:** US-1, US-2, US-3, US-5  
**Status:** Completed

Create the required database tables in Supabase for the bot dashboard.

### Subtasks
- [x] 1.1 Apply migration `20260104130000_bot_dashboard.sql` to Supabase
- [x] 1.2 Verify all tables created: `discord_servers`, `bot_products`, `bot_whitelisted_users`, `bot_command_permissions`
- [x] 1.3 Verify RLS policies are active and working
- [x] 1.4 Test that authenticated users can only access their own data

### Files
- `supabase/migrations/20260104130000_bot_dashboard.sql`

---

## Task 2: Server Management UI
**Requirement:** US-1  
**Status:** Completed

Implement the server selection and overview interface.

### Subtasks
- [x] 2.1 Create server selector dropdown component
- [x] 2.2 Display server list with icons and member counts
- [x] 2.3 Show empty state when no servers linked
- [x] 2.4 Add refresh button to reload server data
- [x] 2.5 Persist selected server in local state

### Files
- `src/pages/DeveloperBotDashboard.tsx`

---

## Task 3: Product Management CRUD
**Requirement:** US-2  
**Status:** Completed

Implement product creation, editing, and deletion.

### Subtasks
- [x] 3.1 Create product list view with whitelisted user counts
- [x] 3.2 Add product creation form with validation
- [x] 3.3 Implement product editing functionality
- [x] 3.4 Add delete confirmation dialog
- [x] 3.5 Validate required fields (name, Roblox Group ID, Payhip API Key)

### Files
- `src/pages/DeveloperBotDashboard.tsx`

---

## Task 4: Command Permission Editor
**Requirement:** US-3  
**Status:** Completed

Implement the command permission configuration interface.

### Subtasks
- [x] 4.1 Display list of configurable commands
- [x] 4.2 Add enable/disable toggle per command
- [x] 4.3 Add "Require Admin" checkbox
- [x] 4.4 Add role ID input for allowed roles
- [x] 4.5 Mark owner-only commands as non-configurable
- [x] 4.6 Save permissions to database on change

### Files
- `src/pages/DeveloperBotDashboard.tsx`

---

## Task 5: Bot Invite Flow
**Requirement:** US-4  
**Status:** Completed

Implement the bot invite button and OAuth flow.

### Subtasks
- [x] 5.1 Add "Add Bot to Server" button in header
- [x] 5.2 Configure correct OAuth2 URL with permissions
- [x] 5.3 Open Discord authorization in new tab

### Files
- `src/pages/DeveloperBotDashboard.tsx`

---

## Task 6: Bot Middleware Integration
**Requirement:** US-3  
**Status:** Completed

Update bot middleware to check Supabase permissions.

### Subtasks
- [x] 6.1 Create `requireCommandPermission()` async function
- [x] 6.2 Query Supabase for command permissions
- [x] 6.3 Check admin flag and allowed roles
- [x] 6.4 Maintain owner-only command bypass
- [x] 6.5 Add graceful fallback when tables don't exist

### Files
- `whitelsiting service/src/bot/middleware/adminCheck.js`

---

## Task 7: Error Handling & Edge Cases
**Requirement:** All  
**Status:** Not Started

Add robust error handling for database and API failures.

### Subtasks
- [ ] 7.1 Handle "table not found" errors gracefully
- [ ] 7.2 Show migration instructions when tables missing
- [ ] 7.3 Add loading states for all async operations
- [ ] 7.4 Display user-friendly error messages
- [ ] 7.5 Add retry logic for transient failures

### Files
- `src/pages/DeveloperBotDashboard.tsx`

---

## Task 8: End-to-End Testing
**Requirement:** All  
**Status:** Not Started

Test the complete flow with real Discord server.

### Subtasks
- [ ] 8.1 Add bot to test Discord server
- [ ] 8.2 Link server to Vectabase account via dashboard
- [ ] 8.3 Create test product and verify in database
- [ ] 8.4 Configure command permissions and test in Discord
- [ ] 8.5 Verify RLS prevents cross-user data access

---

## Summary

| Task | Status | Priority |
|------|--------|----------|
| Task 1: Apply Database Migration | Completed | - |
| Task 2: Server Management UI | Completed | - |
| Task 3: Product Management CRUD | Completed | - |
| Task 4: Command Permission Editor | Completed | - |
| Task 5: Bot Invite Flow | Completed | - |
| Task 6: Bot Middleware Integration | Completed | - |
| Task 7: Error Handling | Not Started | Medium |
| Task 8: End-to-End Testing | Not Started | High |

### Next Steps
1. Add error handling for missing tables (Task 7)
2. Perform end-to-end testing (Task 8)
