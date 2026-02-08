# Implementation Plan: Event Horizon Hardening

## Overview

Fix critical bugs (login loading, data isolation, auth inconsistency) and harden security (SQL injection, error boundaries) in the `database/event-horizon-ui/` codebase. All changes are scoped to that directory. Implementation proceeds from foundational fixes (auth, DB) outward to API routes and UI.

## Tasks

- [x] 1. Fix auth module and environment variable security
  - [x] 1.1 Update `lib/auth.ts` to require `JWT_SECRET` env var instead of deriving from `DB_PASSWORD`
    - Remove the `DB_PASSWORD` fallback for JWT signing
    - If `JWT_SECRET` is not set, return `{ authorized: false, error: 'JWT_SECRET not configured' }` for session auth
    - Remove the hardcoded default for `LATTICE_MASTER_KEY` — if env var is not set, skip Lattice auth entirely
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 1.2 Update `getUser()` in `app/api/projects/route.ts` to use email-based lookup
    - Replace `WHERE identity_id = $1` with `WHERE email = $1` using `payload.email`
    - Use `process.env.JWT_SECRET` instead of `process.env.DB_PASSWORD` for JWT verification
    - Remove hardcoded Lattice key default
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Update `getUser()` in `app/api/organizations/route.ts` to use email-based lookup
    - Same changes as 1.2 — replace `identity_id` lookup with `email` lookup
    - Use `process.env.JWT_SECRET` instead of `process.env.DB_PASSWORD`
    - Remove hardcoded Lattice key default
    - _Requirements: 3.1, 3.2_

  - [x] 1.4 Update `lib/security.ts` to use `JWT_SECRET` env var
    - Change `JWT_SECRET` constant to use `process.env.JWT_SECRET` (no fallback to `DB_PASSWORD`)
    - _Requirements: 3.4_

  - [ ]* 1.5 Write property test for auth consistency (Property 4)
    - **Property 4: Auth functions resolve the same user from the same JWT email**
    - **Validates: Requirements 3.1, 3.2**

- [x] 2. Fix database connection resilience and health check
  - [x] 2.1 Add `healthCheck()` function to `lib/db.ts`
    - Implement a function that runs `SELECT 1` with a 3-second query timeout
    - Return `true` if successful, `false` on any error
    - _Requirements: 5.4_

  - [x] 2.2 Add timeout to `app/api/auth/verify/route.ts`
    - Wrap `verifyAccess()` call in `Promise.race` with a 5-second timeout
    - On timeout, return `{ authorized: false, error: 'Service temporarily unavailable' }` with status 503
    - _Requirements: 5.5_

  - [x] 2.3 Add schema migration for `is_revoked` column on sessions table
    - Create `migrations/007_session_is_revoked.sql` with `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false`
    - Add index on `is_revoked` for revoked sessions
    - _Requirements: 3.6_

- [x] 3. Fix project data isolation in database API routes
  - [x] 3.1 Harden `app/api/database/rows/route.ts` with project ID enforcement and SQL sanitization
    - For session auth (no `auth.projectId`), require `projectId` query param — return 400 if missing
    - Call `checkProjectAccess(projectId, auth.userId)` to verify user has access — return 403 if not
    - Import and use `sanitizeSqlIdentifier` from `lib/security.ts` for schema, table, column, and orderBy params
    - _Requirements: 2.1, 2.5, 4.1, 4.2_

  - [x] 3.2 Harden `app/api/database/tables/route.ts` with project ID enforcement and SQL sanitization
    - For session auth, require `projectId` query param — return 400 if missing
    - Call `checkProjectAccess(projectId, auth.userId)` to verify user has access — return 403 if not
    - Sanitize the `schema` parameter with `sanitizeSqlIdentifier`
    - When `_table_registry` doesn't exist, only return tables that have a `project_id` column with matching rows
    - _Requirements: 2.2, 2.5, 2.6, 4.5_

  - [x] 3.3 Harden `app/api/database/query/route.ts` with project isolation and SQL safety
    - For session auth, require `projectId` from request body or query param — return 400 if missing
    - Call `checkProjectAccess(projectId, auth.userId)` to verify user has access — return 403 if not
    - Set `search_path` for ALL authenticated requests (session and API key), not just API key
    - Expand dangerous patterns to block DDL on system tables from the internal blocklist
    - Add schema-escape detection: block queries with explicit schema references outside `p{projectId}` and `public`
    - _Requirements: 2.3, 2.5, 4.3, 4.4_

  - [ ]* 3.4 Write property test for SQL identifier sanitization (Property 1)
    - **Property 1: SQL identifier sanitization produces safe output**
    - **Validates: Requirements 4.1, 4.2, 4.5**

  - [ ]* 3.5 Write property tests for data isolation enforcement (Properties 2, 3)
    - **Property 2: Session auth without projectId is rejected on database APIs**
    - **Property 3: Unauthorized user-project access is rejected**
    - **Validates: Requirements 2.1, 2.2, 2.5**

  - [ ]* 3.6 Write property tests for query safety (Properties 5, 6)
    - **Property 5: Schema-escaping queries are blocked**
    - **Property 6: DDL on system tables is blocked**
    - **Validates: Requirements 4.3, 4.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Fix login page loading and UI resilience
  - [x] 5.1 Update `hooks/useUser.ts` with timeout and skip support
    - Add `AbortController` with 8-second timeout to the fetch call
    - Accept optional `{ skip?: boolean }` parameter — when true, set `loading = false` immediately and skip fetch
    - On abort or error, set `loading = false` and `user = null`
    - Clean up abort controller on unmount
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 5.2 Update `components/layout/EnterpriseLayout.tsx` to skip auth on public routes
    - Detect if pathname is `/login` or starts with `/api/auth` and pass `{ skip: true }` to `useUser`
    - Add a 10-second safety timeout on the root page (`/`): if data hasn't loaded, redirect to `/login`
    - _Requirements: 1.4, 1.5_

  - [x] 5.3 Create `components/ErrorBoundary.tsx` and wire into `app/layout.tsx`
    - Create a class-based React error boundary with error state, retry button, and "Go to Login" button
    - Style consistently with the existing dark theme
    - Wrap `ProjectProvider` and `EnterpriseLayout` in the error boundary in `app/layout.tsx`
    - _Requirements: 5.1, 5.2_

  - [x] 5.4 Add `getProjectApiParams()` helper to `hooks/useProject.tsx`
    - Add a helper function that returns `projectId=${currentProject.id}` or throws if no project selected
    - Export it from the `useProject` hook return value
    - _Requirements: 2.4_

  - [ ]* 5.5 Write property test for DB connection failure resilience (Property 7)
    - **Property 7: Database connection failures produce 503 responses**
    - **Validates: Requirements 5.3, 5.5**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are scoped to `database/event-horizon-ui/` — no files outside this directory are modified
- `fast-check` needs to be added as a dev dependency for property-based tests
- The `JWT_SECRET` env var must be set in `.env.local` before testing auth changes
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
