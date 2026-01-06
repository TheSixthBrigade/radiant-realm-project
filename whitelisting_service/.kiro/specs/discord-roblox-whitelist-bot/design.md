# Design Document

## Overview

The Discord Roblox Whitelist Bot is a Node.js application that integrates Discord bot functionality with Roblox's Open Cloud API to automate group membership management through Payhip product key validation. The system provides a seamless experience for customers to redeem purchased keys and gain access to a specific Roblox group.

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │    │  Key Manager    │    │  Roblox API     │
│   (Interface)   │◄──►│  (Business)     │◄──►│  (External)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Slash Commands  │    │ Database Layer  │    │ HTTP Client     │
│ Event Handlers  │    │ (SQLite/JSON)   │    │ Rate Limiting   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Runtime**: Node.js 18+
- **Discord Library**: discord.js v14
- **HTTP Client**: axios for Roblox API calls
- **Database**: SQLite with better-sqlite3 for persistence
- **Testing**: Jest for unit tests, fast-check for property-based testing
- **Configuration**: Environment variables via dotenv

## Components and Interfaces

### Discord Bot Interface
```typescript
interface DiscordBotService {
  initialize(): Promise<void>;
  registerCommands(): Promise<void>;
  handleRedeemCommand(interaction: CommandInteraction): Promise<void>;
}
```

### Key Management Service
```typescript
interface KeyManagerService {
  validateKey(key: string): Promise<KeyValidationResult>;
  redeemKey(key: string, discordUserId: string, robloxUsername: string): Promise<RedemptionResult>;
  isKeyRedeemed(key: string): Promise<boolean>;
}

interface KeyValidationResult {
  isValid: boolean;
  isRedeemed: boolean;
  error?: string;
}

interface RedemptionResult {
  success: boolean;
  message: string;
  error?: string;
}
```

### Roblox API Service
```typescript
interface RobloxApiService {
  checkPendingJoinRequest(username: string, groupId: number): Promise<PendingCheckResult>;
  acceptJoinRequest(userId: number, groupId: number): Promise<AcceptResult>;
  getUserIdByUsername(username: string): Promise<number | null>;
}

interface PendingCheckResult {
  isPending: boolean;
  userId?: number;
  error?: string;
}

interface AcceptResult {
  success: boolean;
  error?: string;
}
```

### Database Layer
```typescript
interface DatabaseService {
  initializeDatabase(): Promise<void>;
  storeRedemption(redemption: RedemptionRecord): Promise<void>;
  getRedemption(key: string): Promise<RedemptionRecord | null>;
  logActivity(activity: ActivityLog): Promise<void>;
}

interface RedemptionRecord {
  key: string;
  discordUserId: string;
  robloxUsername: string;
  robloxUserId: number;
  redeemedAt: Date;
}
```

## Data Models

### Configuration
```typescript
interface BotConfig {
  discordToken: string;
  robloxApiKey: string;
  robloxGroupId: number;
  databasePath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### Database Schema
```sql
-- Redemptions table
CREATE TABLE redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT UNIQUE NOT NULL,
  discord_user_id TEXT NOT NULL,
  roblox_username TEXT NOT NULL,
  roblox_user_id INTEGER NOT NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  discord_user_id TEXT,
  roblox_username TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_redemptions_key_hash ON redemptions(key_hash);
CREATE INDEX idx_redemptions_discord_user ON redemptions(discord_user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
```

### Discord Slash Command Structure
```typescript
const redeemCommand = {
  name: 'redeem',
  description: 'Redeem your Payhip product key for Roblox group access',
  options: [
    {
      name: 'key',
      description: 'Your Payhip product secret key',
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: 'username',
      description: 'Your Roblox username',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ]
};
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified after eliminating redundancy:

**Property 1: Input validation consistency**
*For any* input string, the validation functions should consistently classify it as either a valid key format, valid username format, or invalid across all calls
**Validates: Requirements 1.1**

**Property 2: Key redemption state transition**
*For any* valid unredeemed key, redeeming it should result in the key being marked as redeemed and all subsequent redemption attempts being rejected
**Validates: Requirements 1.2, 1.3, 3.1, 3.3**

**Property 3: Invalid key rejection**
*For any* invalid product secret key format, the system should reject the redemption attempt regardless of other inputs
**Validates: Requirements 1.4**

**Property 4: Redemption data persistence**
*For any* successful key redemption, the stored record should contain the exact key, Discord user ID, Roblox username, and a valid timestamp
**Validates: Requirements 1.5**

**Property 5: API call authentication**
*For any* Roblox API request, the HTTP headers should include the configured API key in the authorization header
**Validates: Requirements 4.1**

**Property 6: Correct API endpoint usage**
*For any* group operation, the system should construct the correct Roblox API endpoint URL with the proper group ID (5451777)
**Validates: Requirements 4.2, 4.3**

**Property 7: Rate limit handling**
*For any* rate limit response from the Roblox API, the system should implement exponential backoff retry logic
**Validates: Requirements 4.4**

**Property 8: Error logging completeness**
*For any* API error or redemption attempt, the log entry should contain all required fields without exposing sensitive data
**Validates: Requirements 6.1, 6.2, 6.5**

**Property 9: Atomic redemption operations**
*For any* concurrent redemption attempts of the same key, only one should succeed and be recorded in the database
**Validates: Requirements 3.5**

**Property 10: User feedback appropriateness**
*For any* error condition, the user-facing message should be informative without exposing system internals or sensitive information
**Validates: Requirements 5.5**

## Error Handling

The system implements comprehensive error handling across all layers:

### Discord Bot Layer
- Command validation errors return user-friendly messages
- Network timeouts are handled with retry logic
- Unexpected errors are logged and return generic error messages to users

### Roblox API Layer
- HTTP status code handling (401, 403, 429, 500, etc.)
- Rate limiting with exponential backoff (base delay: 1s, max delay: 60s)
- Request timeout handling (30s timeout)
- Malformed response handling

### Database Layer
- Connection failure recovery
- Transaction rollback on errors
- Constraint violation handling (duplicate keys)
- Database corruption detection and recovery

### Key Management Layer
- Invalid key format detection
- Duplicate redemption prevention
- Data integrity validation
- Concurrent access protection

## Testing Strategy

The testing approach combines unit testing and property-based testing to ensure comprehensive coverage:

### Unit Testing with Jest
Unit tests will cover:
- Specific examples of valid and invalid inputs
- Integration points between Discord bot and services
- Error condition handling with known scenarios
- Database operations with test fixtures
- API response parsing with sample data

### Property-Based Testing with fast-check
Property-based tests will verify universal properties using the fast-check library with a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document properties:

- **Property 1**: Input validation consistency across random string inputs
- **Property 2**: Key state transitions with generated valid keys
- **Property 3**: Invalid key rejection with malformed key generators
- **Property 4**: Data persistence verification with random redemption data
- **Property 5**: API authentication header presence across all requests
- **Property 6**: Endpoint URL construction with various group IDs
- **Property 7**: Rate limit retry behavior with simulated rate limit responses
- **Property 8**: Log entry completeness with generated error scenarios
- **Property 9**: Concurrent redemption handling with race condition simulation
- **Property 10**: Error message sanitization with various error types

Each property-based test will use the format: `**Feature: discord-roblox-whitelist-bot, Property {number}: {property_text}**`

### Test Data Generation
- Valid key generators: Alphanumeric strings matching Payhip format patterns
- Invalid key generators: Various malformed strings (empty, special chars, wrong length)
- Username generators: Valid Roblox username patterns and invalid variations
- Discord ID generators: Valid snowflake ID format
- API response generators: Success and error responses matching Roblox API schemas

### Integration Testing
- End-to-end redemption flow testing
- Database persistence across service restarts
- Discord command interaction testing
- Roblox API integration with test group

## Security Considerations

### Data Protection
- Product keys are hashed using SHA-256 before storage
- Roblox API key is stored as environment variable only
- Discord bot token secured through environment variables
- Database file permissions restricted to application user

### Input Sanitization
- All user inputs validated against strict patterns
- SQL injection prevention through parameterized queries
- Command injection prevention in username validation
- XSS prevention in log output formatting

### Rate Limiting
- Internal rate limiting to prevent API abuse
- Request queuing to respect Roblox API limits
- User-level cooldowns to prevent spam

### Audit Trail
- All redemption attempts logged with timestamps
- Failed authentication attempts tracked
- System configuration changes logged
- Database access patterns monitored

## Deployment Architecture

### Environment Configuration
```bash
# Required environment variables
DISCORD_TOKEN=your_discord_bot_token
ROBLOX_API_KEY=your_roblox_api_key
ROBLOX_GROUP_ID=5451777
DATABASE_PATH=./data/whitelist.db
LOG_LEVEL=info
NODE_ENV=production
```

### File Structure
```
discord-roblox-whitelist-bot/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   └── events/
│   ├── services/
│   │   ├── keyManager.js
│   │   ├── robloxApi.js
│   │   └── database.js
│   ├── utils/
│   │   ├── validation.js
│   │   └── logger.js
│   └── index.js
├── tests/
│   ├── unit/
│   └── property/
├── data/
├── logs/
└── package.json
```

### Dependencies
```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "axios": "^1.6.2",
    "better-sqlite3": "^9.2.2",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "fast-check": "^3.15.0",
    "@types/node": "^20.10.5"
  }
}
```

### Performance Requirements
- Command response time: < 3 seconds for successful redemptions
- Database query time: < 100ms for key lookups
- Roblox API response handling: < 10 seconds with retries
- Memory usage: < 100MB under normal load
- Concurrent user support: Up to 50 simultaneous redemptions

### Monitoring and Logging
- Structured JSON logging with Winston
- Error rate monitoring and alerting
- API response time tracking
- Database performance metrics
- Discord bot uptime monitoring