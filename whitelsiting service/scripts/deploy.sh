#!/bin/bash

# Discord Roblox Whitelist Bot - Deployment Script
# This script handles deployment to production servers

set -e  # Exit on any error

# Configuration
APP_NAME="discord-roblox-whitelist-bot"
DEPLOY_USER="node"
DEPLOY_HOST="your-server.com"
DEPLOY_PATH="/var/www/$APP_NAME"
REPO_URL="git@github.com:yourusername/$APP_NAME.git"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    log "Dependencies check passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    if [ -d "$DEPLOY_PATH" ]; then
        BACKUP_DIR="$DEPLOY_PATH.backup.$(date +%Y%m%d_%H%M%S)"
        cp -r "$DEPLOY_PATH" "$BACKUP_DIR"
        log "Backup created at $BACKUP_DIR"
    else
        warn "No existing deployment found to backup"
    fi
}

# Deploy using PM2
deploy_pm2() {
    log "Deploying with PM2..."
    
    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2
    fi
    
    # Deploy using PM2
    pm2 deploy production setup 2>/dev/null || true
    pm2 deploy production
    
    log "PM2 deployment completed"
}

# Deploy using Docker
deploy_docker() {
    log "Deploying with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Pull latest changes
    git pull origin $BRANCH
    
    # Build and deploy
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    # Clean up old images
    docker image prune -f
    
    log "Docker deployment completed"
}

# Deploy manually
deploy_manual() {
    log "Performing manual deployment..."
    
    # Create deployment directory if it doesn't exist
    mkdir -p "$DEPLOY_PATH"
    cd "$DEPLOY_PATH"
    
    # Clone or pull repository
    if [ ! -d ".git" ]; then
        log "Cloning repository..."
        git clone "$REPO_URL" .
    else
        log "Pulling latest changes..."
        git fetch origin
        git reset --hard origin/$BRANCH
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --only=production
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            warn "Created .env file from .env.example. Please update it with your configuration."
        else
            warn "No .env.example found. Please create .env file manually."
        fi
    fi
    
    # Create necessary directories
    mkdir -p logs data data/backups
    
    # Set proper permissions
    chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"
    chmod -R 755 "$DEPLOY_PATH"
    
    log "Manual deployment completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait a bit for the service to start
    sleep 10
    
    # Check if the process is running (adjust based on your process manager)
    if pgrep -f "discord-roblox-whitelist-bot" > /dev/null; then
        log "✅ Bot is running"
    else
        error "❌ Bot is not running"
    fi
    
    # Additional health checks can be added here
    # For example, checking if the bot responds to Discord API
    
    log "Health check completed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    BACKUP_DIR=$(ls -td $DEPLOY_PATH.backup.* 2>/dev/null | head -1)
    
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        rm -rf "$DEPLOY_PATH"
        mv "$BACKUP_DIR" "$DEPLOY_PATH"
        
        # Restart service
        if command -v pm2 &> /dev/null; then
            pm2 restart $APP_NAME
        elif command -v docker-compose &> /dev/null; then
            docker-compose restart
        fi
        
        log "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log "Starting deployment of $APP_NAME..."
    
    # Parse command line arguments
    DEPLOYMENT_TYPE="manual"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                DEPLOYMENT_TYPE="$2"
                shift 2
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            --help)
                echo "Usage: $0 [--type pm2|docker|manual] [--rollback] [--help]"
                echo ""
                echo "Options:"
                echo "  --type      Deployment type (pm2, docker, or manual)"
                echo "  --rollback  Rollback to previous deployment"
                echo "  --help      Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Perform deployment
    check_dependencies
    backup_current
    
    case $DEPLOYMENT_TYPE in
        pm2)
            deploy_pm2
            ;;
        docker)
            deploy_docker
            ;;
        manual)
            deploy_manual
            ;;
        *)
            error "Invalid deployment type: $DEPLOYMENT_TYPE"
            ;;
    esac
    
    health_check
    
    log "🎉 Deployment completed successfully!"
    log "Bot should now be running in production mode."
}

# Run main function
main "$@"