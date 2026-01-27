/**
 * PM2 Ecosystem Configuration (CommonJS)
 * Production process management for Discord Roblox Whitelist Bot
 */

module.exports = {
    apps: [
        {
            name: 'discord-roblox-whitelist-bot',
            script: 'src/index.js',

            // Process management
            instances: 1,
            exec_mode: 'fork',

            // Auto restart configuration
            autorestart: true,
            watch: false,
            max_memory_restart: '200M',

            // Environment variables
            env: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'info'
            },

            // Logging configuration
            log_file: './logs/pm2-combined.log',
            out_file: './logs/pm2-out.log',
            error_file: './logs/pm2-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Node.js options for ESM support in fork mode
            node_args: '--experimental-specifier-resolution=node --max-old-space-size=256',

            time: true
        }
    ]
};
