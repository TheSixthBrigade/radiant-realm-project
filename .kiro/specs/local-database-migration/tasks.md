# Implementation Plan: Local PostgreSQL Database Migration

## Overview

This plan migrates the Vectabase platform from Supabase to a self-hosted PostgreSQL database. Tasks are ordered to build incrementally, with the migration service created first, followed by the local database setup, API server, and finally updating the Discord bot.

## Tasks

- [x] 1. Set up PostgreSQL database infrastructure
  - [x] 1.1 Create database initialization scripts and schema
    - Create `database/` directory structure
    - Write PostgreSQL schema SQL matching all Supabase tables
    - Include users, sessions, secrets, and audit_logs tables
    - Add all indexes for performance
    - _Requirements: 1.1, 1.2, 8.1, 8.2_

  - [x] 1.2 Create database connection module with pooling
    - Create `server/lib/db.js` with pg pool configuration
    - Support environment-based config (local vs VPS)
    - Implement connection health checks
    - _Requirements: 1.1, 8.6_

  - [ ]* 1.3 Write property test for database connection resilience
    - **Property: Connection pool handles concurrent requests**
    - **Validates: Requirements 8.6**

- [x] 2. Implement encryption layer
  - [x] 2.1 Create encryption service with AES-256-GCM
    - Create `server/lib/encryption.js`
    - Implement encrypt/decrypt functions
    - Use PBKDF2 for key derivation (100,000 iterations)
    - Generate random IV per operation
    - _Requirements: 3.1, 3.3_

  - [x] 2.2 Create database encryption functions
    - Create PostgreSQL functions for transparent encryption
    - Implement `encrypt_value()` and `decrypt_value()` functions
    - _Requirements: 3.4_

  - [ ]* 2.3 Write property test for encryption round-trip
    - **Property 3: Encryption Round-Trip Consistency**
    - **Validates: Requirements 3.4**

  - [ ]* 2.4 Write property test for sensitive data encryption
    - **Property 5: Sensitive Data Encryption**
    - **Validates: Requirements 3.2**

- [ ] 3. Checkpoint - Verify database and encryption
  - Ensure database connects and encryption works
  - Run property tests for encryption
  - Ask user if questions arise

- [-] 4. Build migration service from Supabase
  - [x] 4.1 Create Supabase data export module
    - Create `scripts/migrate-from-supabase.js`
    - Connect to Supabase using service role key
    - Export all tables to JSON files
    - Handle pagination for large tables
    - _Requirements: 2.1, 2.3_

  - [x] 4.2 Create PostgreSQL import module
    - Transform auth.users to local users table
    - Re-encrypt sensitive data with local keys
    - Import with transaction safety
    - Support checkpoint/resume on failure
    - _Requirements: 2.2, 2.5_

  - [x] 4.3 Create migration verification and reporting
    - Verify row counts match source and destination
    - Validate foreign key relationships
    - Generate detailed migration report
    - _Requirements: 2.4, 2.6_

  - [ ]* 4.4 Write property test for migration row count consistency
    - **Property 1: Migration Row Count Consistency**
    - **Validates: Requirements 2.4**

  - [ ]* 4.5 Write property test for foreign key preservation
    - **Property 2: Foreign Key Relationship Preservation**
    - **Validates: Requirements 2.2**

- [x] 5. Implement authentication service
  - [x] 5.1 Create auth service with JWT tokens
    - Create `server/services/auth.js`
    - Implement register, login, logout functions
    - Use bcrypt with cost factor 12 for passwords
    - Issue JWT tokens with configurable expiry
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 5.2 Create session management
    - Implement refresh token flow
    - Store sessions in database
    - Handle token validation middleware
    - _Requirements: 4.5, 4.6, 4.7_

  - [x] 5.3 Implement Discord OAuth integration
    - Create Discord OAuth callback handler
    - Link Discord accounts to local users
    - _Requirements: 4.2_

  - [ ]* 5.4 Write property test for JWT token expiry
    - **Property 6: JWT Token Expiry Consistency**
    - **Validates: Requirements 4.3**

  - [ ]* 5.5 Write property test for session creation
    - **Property 7: Session Creation on Login**
    - **Validates: Requirements 4.5**

  - [ ]* 5.6 Write property test for invalid token rejection
    - **Property 8: Invalid Token Rejection**
    - **Validates: Requirements 4.7**

- [ ] 6. Checkpoint - Verify auth system
  - Test registration and login flows
  - Verify JWT tokens work correctly
  - Ask user if questions arise

- [x] 7. Build API server replacing Edge Functions
  - [x] 7.1 Create Express.js server with middleware
    - Create `server/index.js` main entry point
    - Add CORS, JSON parsing, request logging
    - Implement rate limiting per API key
    - Add request ID generation
    - _Requirements: 5.4, 5.5, 5.7_

  - [x] 7.2 Implement Stripe integration endpoints
    - Create `/api/stripe/onboard` for Connect onboarding
    - Create `/api/stripe/status` for account status
    - Create `/api/stripe/checkout` for checkout sessions
    - Create `/api/stripe/webhook` for webhook handling
    - _Requirements: 5.2_

  - [x] 7.3 Implement product and sales endpoints
    - Create CRUD endpoints for products
    - Create sales query endpoints
    - _Requirements: 5.1_

  - [x] 7.4 Implement whitelist API endpoints
    - Create CRUD endpoints for whitelist management
    - Create developer API key endpoints
    - Create verification endpoint
    - _Requirements: 5.1, 5.3_

  - [x] 7.5 Implement structured error handling
    - Create error handler middleware
    - Return consistent error response format
    - _Requirements: 5.6_

  - [ ]* 7.6 Write property test for rate limiting
    - **Property 9: Rate Limiting Enforcement**
    - **Validates: Requirements 5.4**

  - [ ]* 7.7 Write property test for request logging
    - **Property 10: Request Logging Completeness**
    - **Validates: Requirements 5.5**

  - [ ]* 7.8 Write property test for error response structure
    - **Property 11: Error Response Structure**
    - **Validates: Requirements 5.6**

- [x] 8. Implement secrets management
  - [x] 8.1 Create secrets manager service
    - Create `server/services/secrets.js`
    - Store secrets in encrypted database table
    - Implement get/set/delete operations
    - Add audit logging for all access
    - _Requirements: 9.2, 9.3, 9.5_

  - [x] 8.2 Migrate secrets from Supabase
    - Export STRIPE_SECRET_KEY, DISCORD_TOKEN, etc.
    - Store in local encrypted secrets table
    - Create .env.example with required variables
    - _Requirements: 9.1, 9.3_

  - [ ]* 8.3 Write property test for secret access audit
    - **Property 15: Secret Access Audit Trail**
    - **Validates: Requirements 9.5**

  - [ ]* 8.4 Write property test for secret non-logging
    - **Property 16: Secret Value Non-Logging**
    - **Validates: Requirements 9.4**

- [ ] 9. Checkpoint - Verify API server
  - Test all API endpoints
  - Verify Stripe webhooks work
  - Verify secrets are properly encrypted
  - Ask user if questions arise

- [x] 10. Update Discord bot for local database
  - [x] 10.1 Create PostgreSQL database service for bot
    - Create `whitelisting_service/src/services/postgresDatabase.js`
    - Implement same interface as SupabaseDatabaseService
    - Use connection pooling
    - _Requirements: 6.1, 6.2_

  - [x] 10.2 Update bot configuration for local database
    - Update `whitelisting_service/src/config/database.js`
    - Add DATABASE_TYPE=postgres option
    - Configure connection retry with exponential backoff
    - _Requirements: 6.1, 6.5_

  - [ ] 10.3 Implement whitelist data caching
    - Add in-memory cache with TTL
    - Cache frequently accessed whitelist data
    - _Requirements: 6.6_

  - [ ]* 10.4 Write property test for whitelist persistence
    - **Property 12: Whitelist Persistence Immediacy**
    - **Validates: Requirements 6.3, 6.4**

- [x] 11. Implement backup service
  - [x] 11.1 Create automated backup service
    - Create `server/services/backup.js`
    - Use pg_dump with custom format
    - Encrypt backups with AES-256
    - Implement backup scheduling
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 11.2 Implement backup verification and retention
    - Verify backup integrity after creation
    - Implement 30-day retention policy
    - Add alert on backup failure
    - _Requirements: 7.4, 7.5, 7.7_

  - [ ]* 11.3 Write property test for backup integrity
    - **Property 13: Backup Integrity Verification**
    - **Validates: Requirements 7.5**

- [ ] 12. Implement real-time updates
  - [ ] 12.1 Create WebSocket server for real-time subscriptions
    - Add WebSocket support to API server
    - Implement subscription management
    - Broadcast data changes to subscribers
    - _Requirements: 10.3, 10.4_

  - [ ]* 12.2 Write property test for real-time broadcasting
    - **Property 17: Real-Time Update Broadcasting**
    - **Validates: Requirements 10.4**

- [-] 13. Update frontend for local API
  - [x] 13.1 Create API client replacing Supabase client
    - Create `src/lib/api.ts` with fetch wrapper
    - Implement authentication header injection
    - Handle token refresh automatically
    - _Requirements: 10.1_

  - [ ] 13.2 Update all Supabase client usages
    - Replace supabase.from() calls with API calls
    - Update auth hooks to use local auth
    - Update real-time subscriptions to WebSocket
    - _Requirements: 10.1, 10.5_

- [x] 14. Update steering files
  - [x] 14.1 Update database-schema.md for PostgreSQL
    - Remove Supabase-specific references
    - Document local PostgreSQL schema
    - _Requirements: N/A (documentation)_

  - [x] 14.2 Replace supabase-and-stripe.md with postgresql-and-stripe.md
    - Remove Supabase deployment instructions
    - Add local PostgreSQL setup instructions
    - Update API deployment instructions
    - _Requirements: N/A (documentation)_

- [ ] 15. Final checkpoint - Full system verification
  - Run all property tests
  - Test complete user flow (register → login → create product → purchase)
  - Verify Discord bot whitelist operations
  - Verify backups work
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The migration can be run multiple times safely (idempotent)
- Local development uses same PostgreSQL as VPS (just different connection string)
