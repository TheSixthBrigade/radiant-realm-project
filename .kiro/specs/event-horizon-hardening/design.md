# Design Document: Event Horizon Hardening

## Overview

This design addresses five categories of critical bugs and security issues in the Event Horizon UI (`database/event-horizon-ui/`). The fixes are scoped entirely within this directory and do not touch the main vectabase.com website code.

The changes fall into these areas:
1. **Login resilience** — Add timeout/abort to the `useUser` hook, skip it on public routes, and add a fallback redirect on the root page
2. **Project data isolation** — Enforce `projectId` on all database API routes for session-authenticated users, set `search_path` consistently, and wire the `useProject` context into all API calls
3. **Auth consistency** — Unify user lookup to email-based across all routes, remove hardcoded secrets, require dedicated env vars for JWT and Lattice key
4. **SQL injection prevention** — Sanitize all SQL identifiers (schema, table, column names) before interpolation, strengthen the query blocklist
5. **Error boundaries** — Add a React error boundary, add DB health check, add timeouts to the verify endpoint

## Architecture

The existing architecture is a Next.js 16 app with:
- Client-side React components using hooks (`useUser`, `useProject`) for state
- Server-side API routes under `app/api/` using the `pg` library for direct PostgreSQL access
- JWT-based auth via `jose` with tokens stored in `pqc_session` cookies
- Project isolation via `project_id` columns and a `_table_registry` table

The hardening changes preserve this architecture. No new services or infrastructure are introduced. The changes are surgical fixes to existing modules:

```mermaid
graph TD
    subgraph Client
        A[EnterpriseLayout] --> B[useUser Hook]
        A --> C[useProject Hook]
        D[ErrorBoundary] --> A
        E[Login Page] -.->|skips| B
    end

    subgraph API Routes
        F[/api/auth/verify]
        G[/api/database/rows]
        H[/api/database/tables]
        I[/api/database/query]
        J[/api/projects]
        K[/api/organizations]
    end

    subgraph Shared Libs
        L[lib/auth.ts - verifyAccess]
        M[lib/db.ts - pool + healthCheck]
        N[lib/security.ts - sanitizeSqlIdentifier]
    end

    B -->|fetch with timeout| F
    C -->|injects projectId| G
    C -->|injects projectId| H
    C -->|injects projectId| I

    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L

    L --> M
    G --> N
    H --> N
    I --> N
```

## Components and Interfaces

### 1. `useUser` Hook (`hooks/useUser.ts`)

**Current problem:** No timeout on the fetch to `/api/auth/verify`. If the DB is down, the fetch hangs forever and `loading` stays `true`.

**Fix:**
- Add an `AbortController` with an 8-second timeout to the fetch call
- On abort/error, set `loading = false` and `user = null`
- No automatic retry — the user can refresh manually
- Accept an optional `{ skip: boolean }` parameter so the login page can skip the fetch entirely

```typescript
export function useUser(options?: { skip?: boolean }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(!options?.skip);

    useEffect(() => {
        if (options?.skip) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/verify', { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    if (data.authorized && data.user) {
                        setUser({ /* ... map fields ... */ });
                    }
                }
            } catch (error) {
                // AbortError or network error — user stays null
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        }

        fetchUser();
        return () => { clearTimeout(timeoutId); controller.abort(); };
    }, [options?.skip]);

    return { user, loading };
}
```

### 2. `EnterpriseLayout` (`components/layout/EnterpriseLayout.tsx`)

**Current problem:** Calls `useUser()` on every page including `/login`, causing unnecessary backend calls. Root page shows infinite spinner if data never loads.

**Fix:**
- Detect if pathname is `/login` or starts with `/api/auth` and pass `{ skip: true }` to `useUser`
- Add a 10-second safety timeout on the root page redirect: if data hasn't loaded, redirect to `/login`

```typescript
const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth');
const { user, loading } = useUser({ skip: isPublicRoute });
```

### 3. `useProject` Hook (`hooks/useProject.tsx`)

**Current problem:** Stores `currentProject` but doesn't enforce that API calls include the project ID.

**Fix:**
- Add a helper function `getProjectApiParams()` that returns `?projectId=${currentProject.id}` or throws if no project is selected
- Components calling database APIs should use this helper
- This is a convenience — the real enforcement is server-side (see API routes below)

```typescript
export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');

    const getProjectApiParams = () => {
        if (!context.currentProject?.id) {
            throw new Error('No project selected');
        }
        return `projectId=${context.currentProject.id}`;
    };

    return { ...context, getProjectApiParams };
}
```

### 4. `verifyAccess` in `lib/auth.ts`

**Current problems:**
- Lattice key has a hardcoded default
- JWT secret derived from `DB_PASSWORD` which defaults to `'postgres'`
- `getUser()` in projects/orgs routes looks up by `identity_id` instead of `email`

**Fixes:**
- If `LATTICE_MASTER_KEY` env var is not set, disable Lattice admin access entirely (don't fall back to a default)
- Require a `JWT_SECRET` env var. If not set, reject all session auth
- Add a `userId` field to the auth result for session auth so downstream routes don't need to re-query
- Export a shared `getAuthenticatedUser` function that both `verifyAccess` and the `getUser` functions in projects/orgs routes can use, ensuring consistent email-based lookup

```typescript
const LATTICE_MASTER_KEY = process.env.LATTICE_MASTER_KEY; // No default!
const JWT_SECRET_RAW = process.env.JWT_SECRET;

export async function verifyAccess(req: NextRequest, projectId?: string) {
    // Lattice check — only if env var is set
    if (LATTICE_MASTER_KEY) {
        const latticeToken = req.cookies.get('lattice_admin')?.value;
        if (latticeToken === LATTICE_MASTER_KEY) { /* ... */ }
    }

    // API key check — unchanged

    // Session check
    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return { authorized: false };

    if (!JWT_SECRET_RAW) {
        return { authorized: false, error: 'JWT_SECRET not configured' };
    }

    const secret = new TextEncoder().encode(JWT_SECRET_RAW);
    const { payload } = await jwtVerify(token, secret);

    // Always look up by email
    const userRes = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
    // ...
}
```

### 5. Unified `getUser` for Projects/Orgs Routes

**Current problem:** `getUser()` in `app/api/projects/route.ts` and `app/api/organizations/route.ts` uses `identity_id` lookup which is inconsistent with `verifyAccess()`.

**Fix:** Replace the `getUser()` function in both files to use email-based lookup, matching `verifyAccess()`. Also use the new `JWT_SECRET` env var.

```typescript
async function getUser(req: NextRequest) {
    // Lattice check — only if env var is set
    const latticeKey = process.env.LATTICE_MASTER_KEY;
    if (latticeKey) {
        const latticeToken = req.cookies.get('lattice_admin')?.value;
        if (latticeToken === latticeKey) {
            return { id: 0, email: 'lattice-admin@vectabase.internal', isLatticeAdmin: true };
        }
    }

    const token = req.cookies.get('pqc_session')?.value;
    if (!token) return null;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;

    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret);

        if (payload.isLatticeAdmin) {
            return { id: 0, email: payload.email as string, isLatticeAdmin: true };
        }

        // FIXED: Look up by email, not identity_id
        const result = await query('SELECT id, email FROM users WHERE email = $1', [payload.email]);
        return result.rows[0] || null;
    } catch {
        return null;
    }
}
```

### 6. Database API Routes — Data Isolation

#### `app/api/database/rows/route.ts`

**Fix:**
- For session auth (no `auth.projectId`), require `projectId` as a query parameter. Return 400 if missing.
- Validate that the session user has access to the requested project via `checkProjectAccess()`
- Sanitize `schema`, `table`, and `orderBy` column names using `sanitizeSqlIdentifier()`

#### `app/api/database/tables/route.ts`

**Fix:**
- For session auth, require `projectId` as a query parameter. Return 400 if missing.
- Sanitize the `schema` parameter
- When `_table_registry` doesn't exist, filter tables by checking for `project_id` column AND matching rows, not just showing all tables

#### `app/api/database/query/route.ts`

**Fix:**
- For session auth, require `projectId` from query params or request body. Return 400 if missing.
- Set `search_path` for ALL authenticated requests (not just API key auth)
- Expand the dangerous patterns blocklist to include DDL on system tables
- Add schema-escape detection: block queries containing explicit schema references outside the project schema

### 7. SQL Identifier Sanitization

**Current `sanitizeSqlIdentifier` in `lib/security.ts`:** Already exists and strips non-alphanumeric/underscore characters.

**Fix:** Use this function consistently in all database API routes before interpolating identifiers into SQL. The function is already correct — it just needs to be called everywhere.

```typescript
// In rows/route.ts, tables/route.ts, query/route.ts:
import { sanitizeSqlIdentifier } from '@/lib/security';

const safeSchema = sanitizeSqlIdentifier(schema);
const safeTable = sanitizeSqlIdentifier(table);
// Then use: `"${safeSchema}"."${safeTable}"`
```

### 8. Database Health Check (`lib/db.ts`)

**Fix:** Add a `healthCheck()` function that runs `SELECT 1` with a 3-second timeout.

```typescript
export async function healthCheck(): Promise<boolean> {
    try {
        const client = await pool.connect();
        try {
            await client.query({ text: 'SELECT 1', timeout: 3000 });
            return true;
        } finally {
            client.release();
        }
    } catch {
        return false;
    }
}
```

### 9. Verify Endpoint Timeout (`app/api/auth/verify/route.ts`)

**Fix:** Wrap the `verifyAccess` call in a timeout. If it takes longer than 5 seconds, return 503.

```typescript
export async function GET(req: NextRequest) {
    try {
        const authPromise = verifyAccess(req);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth verification timeout')), 5000)
        );
        const auth = await Promise.race([authPromise, timeoutPromise]);
        // ... rest of handler
    } catch (error: any) {
        if (error.message === 'Auth verification timeout') {
            return NextResponse.json({ authorized: false, error: 'Service temporarily unavailable' }, { status: 503 });
        }
        // ...
    }
}
```

### 10. React Error Boundary (`components/ErrorBoundary.tsx`)

**Fix:** Create a class-based React error boundary component.

```typescript
class ErrorBoundary extends React.Component<Props, State> {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <h2>Something went wrong</h2>
                    <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
                    <button onClick={() => window.location.href = '/login'}>Go to Login</button>
                </div>
            );
        }
        return this.props.children;
    }
}
```

Wrap in `app/layout.tsx`:
```tsx
<ErrorBoundary>
    <ProjectProvider>
        <EnterpriseLayout>{children}</EnterpriseLayout>
    </ProjectProvider>
</ErrorBoundary>
```

### 11. Schema Migration (`schema.sql` / new migration)

**Fix:** Add `is_revoked` column to the `sessions` table:

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked) WHERE is_revoked = true;
```

## Data Models

### Modified: `sessions` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_revoked` | BOOLEAN | `false` | Whether the session has been revoked |

### No new tables are introduced.

### Auth Result Interface (updated)

```typescript
interface AuthResult {
    authorized: boolean;
    userId?: number;
    projectId?: number;
    isAdmin?: boolean;
    isLatticeAdmin?: boolean;
    method?: 'session' | 'api_key';
    error?: string;
}
```

### Environment Variables (required changes)

| Variable | Old Behavior | New Behavior |
|----------|-------------|-------------|
| `JWT_SECRET` | Did not exist; derived from `DB_PASSWORD` | **Required.** Dedicated secret for JWT signing. Auth fails if missing. |
| `LATTICE_MASTER_KEY` | Defaulted to `'vectabase-lattice-2026-master-key'` | **No default.** Lattice admin disabled if not set. |
| `DB_PASSWORD` | Used as JWT secret fallback | Only used for DB connection. No longer used for JWT. |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SQL identifier sanitization produces safe output

*For any* input string, `sanitizeSqlIdentifier(input)` should return a string containing only alphanumeric characters and underscores (matching the regex `/^[a-zA-Z0-9_]*$/`). No special characters, quotes, semicolons, or whitespace should survive sanitization.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 2: Session auth without projectId is rejected on database APIs

*For any* session-authenticated request to the Rows_API, Tables_API, or Query_API that does not include a `projectId` parameter (and where `auth.projectId` is undefined because it's session auth, not API key auth), the API SHALL return a 400 status code with an error message requiring a project ID.

**Validates: Requirements 2.1, 2.2**

### Property 3: Unauthorized user-project access is rejected

*For any* (userId, projectId) pair where the user does not have access to the project (not an org owner and not in `project_users`), calling any database API route with that projectId SHALL return a 403 status code.

**Validates: Requirements 2.5**

### Property 4: Auth functions resolve the same user from the same JWT email

*For any* valid JWT token containing an email address, both `verifyAccess()` and the `getUser()` functions in the projects and organizations routes SHALL resolve to the same user ID when given the same request.

**Validates: Requirements 3.1, 3.2**

### Property 5: Schema-escaping queries are blocked

*For any* SQL query string that contains an explicit schema reference (e.g., `public.tablename`, `pg_catalog.pg_tables`, or any `schemaname.` pattern) where the schema is not the user's project schema (`p{projectId}`), the Query_API SHALL reject the query with a 403 status.

**Validates: Requirements 4.3**

### Property 6: DDL on system tables is blocked

*For any* SQL statement that contains a DDL keyword (CREATE, ALTER, DROP, TRUNCATE) targeting a table name from the internal tables blocklist, the Query_API SHALL reject the query with a 403 status.

**Validates: Requirements 4.4**

### Property 7: Database connection failures produce 503 responses

*For any* database API route (rows, tables, query, verify), when the database connection pool is unable to connect, the route SHALL return a JSON response with status 503 within 5 seconds, rather than hanging or returning a 500 with a raw error.

**Validates: Requirements 5.3, 5.5**

## Error Handling

### Client-Side

| Scenario | Handling |
|----------|----------|
| `useUser` fetch timeout (8s) | AbortController aborts fetch; `loading` set to false, `user` set to null |
| `useUser` network error | Caught in try/catch; `loading` set to false, `user` set to null |
| React component crash | ErrorBoundary catches; shows recovery UI with retry and login buttons |
| Root page data load timeout (10s) | EnterpriseLayout redirects to `/login` |
| No project selected when calling DB API | `getProjectApiParams()` throws; caller should handle gracefully |

### Server-Side

| Scenario | Handling |
|----------|----------|
| DB connection failure in verify | 503 JSON response within 5 seconds via `Promise.race` timeout |
| DB connection failure in database APIs | 503 JSON response; `healthCheck()` can be used for proactive checks |
| Missing `JWT_SECRET` env var | Session auth returns `{ authorized: false, error: 'JWT_SECRET not configured' }` |
| Missing `LATTICE_MASTER_KEY` env var | Lattice admin path is skipped entirely; no default key used |
| Invalid SQL identifier characters | `sanitizeSqlIdentifier` strips them; query proceeds with safe identifier |
| Session auth without projectId on DB APIs | 400 response: `{ error: 'Project ID is required for session-based access' }` |
| User lacks project access | 403 response: `{ error: 'Access denied to this project' }` |
| DDL on system tables | 403 response: `{ error: 'Query blocked: Cannot modify system tables' }` |
| Schema-escaping query | 403 response: `{ error: 'Query blocked: Cross-schema access not allowed' }` |

## Testing Strategy

### Testing Framework

- **Unit/Integration tests:** Playwright (already configured in the project)
- **Property-based tests:** `fast-check` library (to be added as a dev dependency)
  - Minimum 100 iterations per property test
  - Each test tagged with: `Feature: event-horizon-hardening, Property {N}: {title}`

### Unit Tests (specific examples and edge cases)

- `useUser` hook: mock fetch to verify timeout behavior, error handling, skip behavior on login page
- `EnterpriseLayout`: verify login path skips auth, root page timeout redirect
- `ErrorBoundary`: verify it catches thrown errors and renders recovery UI
- `verifyAccess`: verify Lattice disabled when env var missing, JWT_SECRET required, email-based lookup
- `getUser` in projects/orgs: verify email-based lookup matches `verifyAccess`
- `healthCheck`: verify returns true when DB is up, false when down
- Verify endpoint: verify 503 on DB timeout
- Schema migration: verify `is_revoked` column exists on sessions table

### Property-Based Tests

Each correctness property above gets a dedicated `fast-check` test:

1. **Property 1** — Generate random strings (including SQL injection payloads, unicode, special chars) → verify `sanitizeSqlIdentifier` output matches `/^[a-zA-Z0-9_]*$/`
2. **Property 2** — Generate random session-auth request shapes without projectId → verify 400 response from each DB API route
3. **Property 3** — Generate random (userId, projectId) pairs not in the access list → verify 403
4. **Property 4** — Generate random email addresses, create JWTs → verify both auth functions resolve to the same user
5. **Property 5** — Generate random SQL strings with schema prefixes outside project schema → verify 403
6. **Property 6** — Generate random DDL statements targeting system table names → verify 403
7. **Property 7** — For each DB API route, simulate connection failure → verify 503 within timeout

### Test Organization

Tests live under `database/event-horizon-ui/tests/`:
- `tests/unit/sanitize.test.ts` — Property 1 + unit tests for sanitization
- `tests/unit/auth.test.ts` — Property 4 + unit tests for auth consistency, Lattice, JWT_SECRET
- `tests/unit/isolation.test.ts` — Properties 2, 3 + unit tests for data isolation
- `tests/unit/query-safety.test.ts` — Properties 5, 6 + unit tests for SQL safety
- `tests/unit/resilience.test.ts` — Property 7 + unit tests for timeouts, error boundary, health check
