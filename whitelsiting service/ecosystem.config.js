/**
 * PM2 Ecosystem Configuration
 * Production process management for Discord Roblox Whitelist Bot
 */

module.exports = {
  apps: [
    {
      name: 'discord-roblox-whitelist-bot',
      script: 'src/index.js',
      
      // Process management
      instances: 1, // Single instance for Discord bot
      exec_mode: 'fork', // Fork mode for single instance
      
      // Auto restart configuration
      autorestart: true,
      watch: false, // Disable in production
      max_memory_restart: '200M',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      
      // Development environment
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        watch: true,
        ignore_watch: ['node_modules', 'logs', 'data']
      },
      
      // Logging configuration
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced PM2 features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Source map support
      source_map_support: true,
      
      // Node.js options
      node_args: '--max-old-space-size=256',
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/discord-roblox-whitelist-bot.git',
      path: '/var/www/discord-roblox-whitelist-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};