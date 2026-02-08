# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs and hardening the db.vectabase.com platform (Event Horizon UI). The platform is a self-hosted database management system built with Next.js 16, PostgreSQL, and JWT-based authentication. Five categories of critical issues have been identified: login page failures, project data isolation breaches, authentication security weaknesses, SQL injection vectors, and missing error boundaries. All changes are scoped exclusively to the `database/event-horizon-ui/` directory.

## Glossary

- **Event_Horizon_UI**: The Next.js application powering the db.vectabase.com database management platform
- **EnterpriseLayout**: The root layout component that wraps all pages, manages auth state, and controls navigation
- **useUser_Hook**: The React hook (`hooks/useUser.ts`) that fetches the current authenticated user by calling `/api/auth/verify`
- **useProject_Hook**: The React context hook (`hooks/useProject.tsx`) that stores the currently selected project
- **Verify_Endpoint**: The `/api/auth/verify` API route that validates session tokens and returns user data
- **Auth_Module**: The `lib/auth.ts` module containing the `verifyAccess()` function for request authentication
- **Rows_API**: The `/api/database/rows` route handling CRUD operations on table rows
- **Tables_API**: The `/api/database/tables` route listing tables for a project
- **Query_API**: The `/api/database/query` route executing arbitrary SQL statements
- **Project_ID**: The integer identifier for a project, used to isolate data between tenants
- **Lattice_Key**: The emergency admin access key for platform-wide administrative operations
- **Session_Token**: A JWT stored in the `pqc_session` cookie, used for session-based authentication
- **Table_Registry**: The `_table_registry` table that maps table names to project IDs for data isolation
- **SQL_Identifier**: A database object name (table name, column name, schema name) used in SQL queries
- **Error_Boundary**: A React component that catches JavaScript errors in its child component tree and displays a fallback UI

## Requirements

### Requirement 1: Login Page Loading Resilience

**User Story:** As a user, I want the login page to load reliably regardless of backend health, so that I can always access the authentication interface.

#### Acceptance Criteria

1. WHEN the login page is loaded, THE useUser_Hook SHALL complete its fetch within 8 seconds or abort with a timeout error
2. WHEN the Verify_Endpoint is unreachable or returns an error, THE useUser_Hook SHALL set loading to false and user to null within the timeout period
3. WHEN the useUser_Hook fetch fails due to a network error or timeout, THE useUser_Hook SHALL not retry automatically and SHALL set loading to false
4. WHEN the root page (`/`) is loaded and the EnterpriseLayout cannot determine the user's organization within 10 seconds, THE EnterpriseLayout SHALL redirect to the login page
5. WHEN the EnterpriseLayout is rendering the login path (`/login`), THE useUser_Hook SHALL not be invoked to avoid unnecessary backend calls on public routes

### Requirement 2: Project Data Isolation Enforcement

**User Story:** As a platform operator, I want strict data isolation between projects, so that no user can view or modify another project's data through the dashboard or API.

#### Acceptance Criteria

1. WHEN a session-authenticated user calls the Rows_API without a `projectId` query parameter, THE Rows_API SHALL return a 400 error requiring a project ID
2. WHEN a session-authenticated user calls the Tables_API without a `projectId` query parameter, THE Tables_API SHALL return a 400 error requiring a project ID
3. WHEN a session-authenticated user calls the Query_API, THE Query_API SHALL set the PostgreSQL `search_path` to the project-specific schema before executing the query
4. WHEN the useProject_Hook provides a `currentProject`, THE Event_Horizon_UI SHALL include the project ID in all API calls to the Rows_API, Tables_API, and Query_API
5. WHEN a user calls any database API with a project ID, THE Auth_Module SHALL verify that the user has access to that project before proceeding
6. WHEN the `_table_registry` does not exist and a project ID is provided, THE Tables_API SHALL return only tables that contain a `project_id` column with matching rows, not all tables

### Requirement 3: Authentication Consistency and Security

**User Story:** As a platform operator, I want consistent and secure authentication across all API routes, so that users are reliably identified and unauthorized access is prevented.

#### Acceptance Criteria

1. THE Auth_Module SHALL use a single, consistent method (email-based lookup) to resolve user identity from JWT tokens across all API routes
2. WHEN the `getUser()` function in the Projects_API or Organizations_API decodes a JWT, THE function SHALL look up the user by email (not by `identity_id`) to match the behavior of `verifyAccess()`
3. THE Event_Horizon_UI SHALL not use a hardcoded default value for the Lattice_Key; IF the `LATTICE_MASTER_KEY` environment variable is not set, THEN THE Auth_Module SHALL disable Lattice admin access entirely
4. THE Event_Horizon_UI SHALL not derive the JWT signing secret from `DB_PASSWORD`; THE Auth_Module SHALL require a dedicated `JWT_SECRET` environment variable
5. IF the `JWT_SECRET` environment variable is not set, THEN THE Auth_Module SHALL refuse to start or SHALL reject all session-based authentication attempts
6. THE sessions table in the database schema SHALL include an `is_revoked` boolean column with a default of false

### Requirement 4: SQL Injection Prevention

**User Story:** As a platform operator, I want all SQL queries to be safe from injection attacks, so that malicious users cannot access or destroy data.

#### Acceptance Criteria

1. WHEN the Rows_API constructs SQL queries, THE Rows_API SHALL validate schema names and table names using an allowlist of characters (alphanumeric and underscores only) before interpolating them into SQL
2. WHEN the Rows_API constructs SQL queries, THE Rows_API SHALL validate column names using an allowlist of characters (alphanumeric and underscores only) before interpolating them into SQL
3. WHEN the Query_API receives a SQL statement from a session-authenticated user, THE Query_API SHALL restrict execution to the project-specific schema by setting `search_path` and SHALL block queries that reference schemas outside the project scope
4. WHEN the Query_API receives a SQL statement, THE Query_API SHALL block DDL statements (CREATE, ALTER, DROP) on system tables listed in the internal tables blocklist
5. WHEN the Tables_API constructs SQL queries, THE Tables_API SHALL validate the schema parameter using an allowlist of characters before interpolating it into SQL

### Requirement 5: Error Boundaries and Resilient UI

**User Story:** As a user, I want the application to handle errors gracefully, so that a single component failure does not crash the entire interface.

#### Acceptance Criteria

1. THE Event_Horizon_UI SHALL include a React Error_Boundary component at the application root that catches rendering errors and displays a recovery UI
2. WHEN a component within the Error_Boundary throws an error, THE Error_Boundary SHALL display an error message and a button to retry or navigate to a safe page
3. WHEN any database API route encounters a database connection failure, THE API route SHALL return a structured JSON error response with a 503 status code within 5 seconds
4. THE DB_Module (`lib/db.ts`) SHALL expose a health check function that tests database connectivity with a timeout
5. WHEN the Verify_Endpoint encounters a database connection failure, THE Verify_Endpoint SHALL return a 503 status with a structured error message instead of hanging indefinitely
