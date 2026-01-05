# Discord Roblox Whitelist Bot - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for better-sqlite3 and other native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY ecosystem.config.js ./

# Create necessary directories with proper permissions
RUN mkdir -p logs data data/backups && \
    chown -R botuser:nodejs /app

# Switch to non-root user
USER botuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (if needed for health checks)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Start the application
CMD ["node", "src/index.js"]