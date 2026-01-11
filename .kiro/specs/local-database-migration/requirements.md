# Requirements Document

## Introduction

This document specifies the requirements for migrating the Vectabase platform from Supabase to a fully local PostgreSQL database with enterprise-grade encryption, security, and performance. The migration will transfer all existing data including profiles, products, sales, whitelist entries, bot configurations, developer API data, and secrets.

## Glossary

- **Local_Database**: Self-hosted PostgreSQL instance running on the user's VPS or local machine
- **Migration_Service**: Component responsible for extracting data from Supabase and importing to Local_Database
- **Encryption_Layer**: AES-256-GCM encryption for sensitive data at rest
- **Auth_Service**: Local authentication service replacing Supabase Auth
- **API_Server**: Express.js server providing REST API endpoints replacing Supabase Edge Functions
- **Backup_Service**: Automated backup system with encrypted snapshots
- **Whitelist_Service**: Discord bot service that manages whitelist data
- **Secret_Manager**: Secure storage for API keys, tokens, and credentials

## Requirements

### Requirement 1: Database Infrastructure Setup

**User Story:** As a platform owner, I want a local PostgreSQL database with enterprise security, so that I have full control over my data without third-party dependencies.

#### Acceptance Criteria

1. THE Local_Database SHALL use PostgreSQL 16+ with full ACID compliance
2. THE Local_Database SHALL enable pgcrypto extension for encryption functions
3. THE Local_Database SHALL use SSL/TLS for all connections
4. THE Local_Database SHALL implement connection pooling with PgBouncer
5. WHEN the database starts, THE Local_Database SHALL verify encryption keys are configured
6. THE Local_Database SHALL store all data on encrypted disk volumes

### Requirement 2: Data Migration from Supabase

**User Story:** As a platform owner, I want all my existing data migrated from Supabase, so that I don't lose any user data, products, sales, or whitelist entries.

#### Acceptance Criteria

1. WHEN migration runs, THE Migration_Service SHALL export all tables from Supabase
2. THE Migration_Service SHALL preserve all foreign key relationships during migration
3. THE Migration_Service SHALL migrate the following tables: profiles, products, sales, stores, payment_transactions, whitelist_systems, whitelist_users, api_keys, discord_servers, bot_products, bot_whitelisted_users, bot_command_permissions, developer_api_keys, developer_subscriptions, obfuscation_credits, obfuscation_usage, developer_products, whitelist_entries
4. THE Migration_Service SHALL verify row counts match between source and destination
5. IF migration fails partway, THEN THE Migration_Service SHALL support resuming from last checkpoint
6. THE Migration_Service SHALL generate a migration report with success/failure status per table

### Requirement 3: Encryption at Rest

**User Story:** As a platform owner, I want all sensitive data encrypted at rest, so that data is protected even if the database files are compromised.

#### Acceptance Criteria

1. THE Encryption_Layer SHALL use AES-256-GCM for encrypting sensitive columns
2. THE Encryption_Layer SHALL encrypt: API keys, Stripe account IDs, PayPal credentials, Roblox API keys, license keys, Discord tokens
3. THE Encryption_Layer SHALL derive encryption keys using PBKDF2 with 100,000 iterations
4. WHEN data is queried, THE Encryption_Layer SHALL decrypt transparently via database functions
5. THE Encryption_Layer SHALL support key rotation without data loss
6. THE Secret_Manager SHALL store master encryption key in environment variables, not in database

### Requirement 4: Authentication Service

**User Story:** As a platform owner, I want local authentication replacing Supabase Auth, so that user login and sessions work without external dependencies.

#### Acceptance Criteria

1. THE Auth_Service SHALL support email/password authentication
2. THE Auth_Service SHALL support Discord OAuth login
3. THE Auth_Service SHALL issue JWT tokens with configurable expiry
4. THE Auth_Service SHALL hash passwords using bcrypt with cost factor 12
5. WHEN a user logs in, THE Auth_Service SHALL create a session record
6. THE Auth_Service SHALL support refresh tokens for session extension
7. IF a token is invalid or expired, THEN THE Auth_Service SHALL return 401 Unauthorized

### Requirement 5: API Server Replacing Edge Functions

**User Story:** As a platform owner, I want a local API server replacing Supabase Edge Functions, so that all business logic runs locally.

#### Acceptance Criteria

1. THE API_Server SHALL implement all existing Edge Function endpoints
2. THE API_Server SHALL handle Stripe Connect onboarding and webhooks
3. THE API_Server SHALL handle PayPal integration endpoints
4. THE API_Server SHALL implement rate limiting per API key
5. THE API_Server SHALL log all requests with request ID for debugging
6. WHEN an API request fails, THE API_Server SHALL return structured error responses
7. THE API_Server SHALL support CORS for frontend requests

### Requirement 6: Whitelist Service Database Integration

**User Story:** As a platform owner, I want the Discord bot to use the local database, so that whitelist data is never lost.

#### Acceptance Criteria

1. THE Whitelist_Service SHALL connect to Local_Database instead of Supabase
2. THE Whitelist_Service SHALL use connection pooling for database connections
3. WHEN a user redeems a key, THE Whitelist_Service SHALL persist to Local_Database immediately
4. THE Whitelist_Service SHALL sync whitelist data bidirectionally with the main platform
5. IF database connection fails, THEN THE Whitelist_Service SHALL retry with exponential backoff
6. THE Whitelist_Service SHALL cache frequently accessed data in memory with TTL

### Requirement 7: Backup and Recovery

**User Story:** As a platform owner, I want automated encrypted backups, so that I can recover from any data loss.

#### Acceptance Criteria

1. THE Backup_Service SHALL create daily encrypted backups
2. THE Backup_Service SHALL use pg_dump with custom format for backups
3. THE Backup_Service SHALL encrypt backups using AES-256 before storage
4. THE Backup_Service SHALL retain backups for 30 days minimum
5. WHEN backup completes, THE Backup_Service SHALL verify backup integrity
6. THE Backup_Service SHALL support point-in-time recovery using WAL archiving
7. IF backup fails, THEN THE Backup_Service SHALL send alert notification

### Requirement 8: Performance and Indexing

**User Story:** As a platform owner, I want the database to be fast and responsive, so that the platform performs better than Supabase.

#### Acceptance Criteria

1. THE Local_Database SHALL create indexes on all foreign key columns
2. THE Local_Database SHALL create indexes on frequently queried columns (discord_id, roblox_id, license_key, api_key)
3. THE Local_Database SHALL use WAL mode for better concurrent performance
4. THE Local_Database SHALL configure shared_buffers to 25% of available RAM
5. WHEN queries exceed 100ms, THE Local_Database SHALL log slow queries
6. THE Local_Database SHALL support connection pooling with minimum 10 connections

### Requirement 9: Secret Migration

**User Story:** As a platform owner, I want all secrets and API keys migrated securely, so that integrations continue working.

#### Acceptance Criteria

1. THE Migration_Service SHALL export all Supabase secrets
2. THE Secret_Manager SHALL store secrets in encrypted environment files
3. THE Secret_Manager SHALL support the following secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DISCORD_TOKEN, DISCORD_CLIENT_ID, ROBLOX_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
4. THE Secret_Manager SHALL never log secret values
5. WHEN secrets are accessed, THE Secret_Manager SHALL audit log the access

### Requirement 10: Frontend Integration

**User Story:** As a platform owner, I want the frontend to work with the local database, so that the web application functions correctly.

#### Acceptance Criteria

1. THE API_Server SHALL provide endpoints matching Supabase client expectations
2. THE Frontend SHALL be updated to use local API endpoints
3. THE API_Server SHALL implement real-time subscriptions using WebSockets
4. WHEN data changes, THE API_Server SHALL broadcast updates to subscribed clients
5. THE Frontend SHALL handle authentication via local Auth_Service
