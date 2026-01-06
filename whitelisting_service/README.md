# Discord Roblox Whitelist Bot

A secure Discord bot that manages Roblox group whitelist access through Payhip product key validation. Features enterprise-grade security with encrypted database storage, comprehensive audit logging, and automatic group membership management.

## 🌟 Features

- **🔐 Secure Key Management**: Product keys are hashed with bcrypt + SHA-256 for maximum security
- **🎮 Automatic Group Access**: Automatically accepts pending Roblox group join requests
- **🔒 Enterprise Security**: AES-256-CBC encrypted backups, Row Level Security policies, audit logging
- **⚡ Rate Limiting**: Built-in protection against spam and abuse
- **📊 Comprehensive Logging**: Structured logging with Winston for all operations
- **🛡️ Input Validation**: Strict validation and sanitization of all user inputs
- **💾 Encrypted Database**: Secure JSON-based database with automatic backups
- **🔄 Graceful Shutdown**: Proper cleanup and backup on shutdown

## 📋 Prerequisites

- Node.js 18+ installed
- Discord bot token and application ID
- Roblox Open Cloud API key with group management permissions
- Payhip account for product key generation

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd discord-roblox-whitelist-bot

# Install dependencies
npm install
```

### 2. Configuration

Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_GUILD_ID=your_guild_id_optional

# Roblox API Configuration
ROBLOX_API_KEY=your_roblox_api_key
ROBLOX_GROUP_ID=5451777

# Database Configuration
DATABASE_PATH=./data/whitelist.json
DB_ENCRYPTION_KEY=generate_64_char_hex_key
BACKUP_PATH=./data/backups/

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

### 3. Generate Encryption Key

Generate a secure 64-character encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env` file as `DB_ENCRYPTION_KEY`.

### 4. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token to `DISCORD_TOKEN`
5. Copy the application ID to `DISCORD_CLIENT_ID`
6. Enable "Message Content Intent" if needed
7. Invite bot to your server with these permissions:
   - `applications.commands` (for slash commands)
   - `bot` scope

### 5. Roblox API Setup

1. Go to [Roblox Creator Dashboard](https://create.roblox.com/)
2. Navigate to your group settings
3. Go to "Open Cloud" → "API Keys"
4. Create a new API key with these permissions:
   - `group:read`
   - `group:write`
5. Copy the API key to `ROBLOX_API_KEY`

### 6. Start the Bot

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📝 Usage

### Commands

#### `/redeem`
Redeem a Payhip product key for Roblox group access.

**Parameters:**
- `key`: Your Payhip product secret key
- `username`: Your Roblox username

**Example:**
```
/redeem key:ABC123-DEF456 username:YourRobloxName
```

#### `/status`
Check bot status and health information (shows database stats, API health, rate limits).

### Redemption Flow

1. User purchases product key from Payhip
2. User sends join request to Roblox group
3. User runs `/redeem` command in Discord with key and Roblox username
4. Bot validates the key (single-use only)
5. Bot checks if user has pending join request
6. Bot automatically accepts the join request
7. User gains access to the Roblox group

## 🏗️ Architecture

```
src/
├── bot/
│   ├── client.js              # Discord bot client
│   ├── commandRegistry.js     # Command registration
│   └── commands/
│       ├── redeem.js          # Redeem command
│       └── status.js          # Status command
├── services/
│   ├── database.js            # Secure database service
│   ├── robloxApi.js           # Roblox API integration
│   └── keyManager.js          # Key management logic
├── utils/
│   ├── validation.js          # Input validation
│   └── logger.js              # Logging utilities
├── config/
│   └── database.js            # Database configuration
└── index.js                   # Main entry point
```

## 🔒 Security Features

### Database Security
- **AES-256-CBC encryption** for backup data
- **bcrypt + SHA-256** dual-layer key hashing
- **Row Level Security (RLS)** policies
- **Atomic file operations** with transaction safety
- **Sensitive data hashing** (IP addresses, user agents)

### API Security
- **Rate limiting** with exponential backoff
- **Request authentication** with API keys
- **Input validation** and sanitization
- **SQL injection prevention**
- **XSS prevention** in log outputs

### Operational Security
- **Comprehensive audit logging**
- **Automatic encrypted backups**
- **Graceful error handling**
- **Security event monitoring**
- **Process isolation**

## 📊 Monitoring

### Logs
- `./logs/combined.log` - All application logs
- `./logs/error.log` - Error logs only
- `./logs/database-audit.log` - Database operations
- `./logs/pm2-*.log` - PM2 process logs (if using PM2)

### Health Checks
The `/status` command provides:
- Bot uptime and connection status
- Database statistics
- Roblox API health
- Rate limiting status
- Recent activity metrics

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- PM2 deployment
- Docker deployment
- Systemd service setup
- Security hardening
- Monitoring and maintenance

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run property-based tests
npm run test:property
```

## 📦 Dependencies

### Core
- `discord.js` - Discord API wrapper
- `axios` - HTTP client for Roblox API
- `bcrypt` - Password hashing
- `winston` - Logging framework
- `dotenv` - Environment configuration

### Development
- `jest` - Testing framework
- `fast-check` - Property-based testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT

## ⚠️ Important Notes

- **Single-use keys**: Each product key can only be redeemed once
- **Pending requests**: Users must send a join request to the group before redeeming
- **Rate limiting**: Users are limited to 5 redemption attempts per 5 minutes
- **Data retention**: All redemptions are logged for audit purposes
- **Backup strategy**: Database is automatically backed up on shutdown

## 🆘 Troubleshooting

### Bot not responding
- Check Discord token validity
- Verify bot has proper permissions
- Check command deployment status

### Roblox API errors
- Verify API key permissions include `group:read` and `group:write`
- Check group ID is correct
- Monitor rate limiting status

### Database errors
- Verify encryption key is set
- Check file permissions on data directory
- Ensure sufficient disk space

### Common Issues
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting guide.

## 📞 Support

For issues and questions:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Review the troubleshooting section
4. Check Discord bot permissions
5. Test Roblox API connectivity

## 🎯 Roadmap

- [ ] Web dashboard for administration
- [ ] Multiple group support
- [ ] Custom role assignment
- [ ] Webhook notifications
- [ ] Analytics and reporting
- [ ] Multi-language support