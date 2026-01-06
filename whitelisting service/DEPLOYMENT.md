# Deployment Guide

This guide covers different deployment options for the Discord Roblox Whitelist Bot.

## Prerequisites

- Node.js 18+ installed
- Discord bot token and application ID
- Roblox API key with group management permissions
- Database encryption key (64 character hex string)

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.production .env
   ```

2. Fill in your configuration values in `.env`:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `DISCORD_CLIENT_ID`: Your Discord application client ID
   - `ROBLOX_API_KEY`: Your Roblox Open Cloud API key
   - `ROBLOX_GROUP_ID`: Your Roblox group ID (default: 5451777)
   - `DB_ENCRYPTION_KEY`: 64-character encryption key for database

3. Generate a secure encryption key:
   ```javascript
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Deployment Options

### Option 1: PM2 (Recommended for VPS)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

4. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```

5. Monitor the application:
   ```bash
   pm2 status
   pm2 logs discord-roblox-whitelist-bot
   ```

### Option 2: Docker

1. Build the Docker image:
   ```bash
   docker-compose build
   ```

2. Start the container:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop the container:
   ```bash
   docker-compose down
   ```

### Option 3: Manual/Systemd

1. Install dependencies:
   ```bash
   npm install --production
   ```

2. Create systemd service file (`/etc/systemd/system/discord-bot.service`):
   ```ini
   [Unit]
   Description=Discord Roblox Whitelist Bot
   After=network.target

   [Service]
   Type=simple
   User=node
   WorkingDirectory=/path/to/your/bot
   ExecStart=/usr/bin/node src/index.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start the service:
   ```bash
   sudo systemctl enable discord-bot
   sudo systemctl start discord-bot
   ```

## Security Considerations

### File Permissions
```bash
# Set proper ownership
chown -R node:node /path/to/bot

# Set secure permissions
chmod 600 .env
chmod 755 src/
chmod 700 data/
chmod 700 logs/
```

### Firewall Configuration
The bot doesn't need any incoming ports open, only outbound HTTPS (443) for Discord and Roblox APIs.

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique encryption keys
- Rotate API keys regularly
- Use least-privilege API permissions

## Monitoring and Maintenance

### Health Checks
The bot includes built-in health monitoring:
- Database connectivity
- Roblox API status
- Discord connection status
- Memory usage tracking

### Log Management
Logs are automatically rotated and stored in:
- `./logs/combined.log` - All application logs
- `./logs/error.log` - Error logs only
- `./logs/database-audit.log` - Database operations

### Backup Strategy
- Database backups are created automatically on shutdown
- Manual backups can be triggered via the database service
- Store backups in a separate location/service

### Updates
1. Stop the bot
2. Pull latest changes
3. Install new dependencies
4. Restart the bot
5. Verify functionality

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check Discord token validity
   - Verify bot permissions in Discord server
   - Check command deployment status

2. **Roblox API errors**
   - Verify API key permissions
   - Check group ID configuration
   - Monitor rate limiting

3. **Database errors**
   - Check file permissions
   - Verify encryption key
   - Check disk space

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Performance Monitoring
Monitor key metrics:
- Memory usage (should stay under 200MB)
- Response times (commands should respond within 3 seconds)
- Error rates (should be minimal)
- API rate limiting status

## Scaling Considerations

The bot is designed to run as a single instance due to Discord's connection model. For high availability:

1. Use process managers (PM2) with auto-restart
2. Monitor with external health checks
3. Set up alerting for failures
4. Keep database backups current
5. Use container orchestration for automatic failover

## Support

For deployment issues:
1. Check logs for error messages
2. Verify all environment variables are set
3. Test API connectivity manually
4. Review Discord bot permissions
5. Check system resources (memory, disk space)