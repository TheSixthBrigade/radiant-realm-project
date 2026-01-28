#!/bin/bash

# Vectabase "Iron Curtain" Production Orchestrator 🧬🛰️
# Optimized for GitHub Deployment to hub.vectabase.com

echo "🚀 Starting Production Sync & Deploy..."

# 1. GitHub Sync (Clean Slate)
echo "📥 Syncing code from GitHub..."
# Assuming we are running this from /var/www/react-app/event-horizon-ui
# or the root folder if the whole workspace is pushed.
git reset --hard
git clean -fd
git pull origin main

# 2. Infrastructure Check (Node, Nginx, Postgres)
# We only do this if they aren't installed to save time on repeating deploys
if ! command -v nginx &> /dev/null || ! command -v node &> /dev/null; then
    echo "📦 Installing core dependencies..."
    sudo apt-get update -y
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx apache2-utils postgresql postgresql-contrib
    sudo apt-get install -y nodejs nginx apache2-utils postgresql postgresql-contrib
fi

# 2.5 Start Database (Docker Compose)
echo "🐘 Starting database services..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$DB_DIR/docker-compose.yml" ]; then
    cd "$DB_DIR"
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "📦 Installing Docker Compose..."
        sudo apt-get update
        sudo apt-get install -y docker-compose
    fi
    sudo docker-compose up -d
    cd "$SCRIPT_DIR"
else
    echo "⚠️ docker-compose.yml not found at $DB_DIR/docker-compose.yml"
fi

# 3. Build Process
echo "🏗️ Installing dependencies and building..."
npm install
npm run build

# 4. Global Gate (Nginx Config)
echo "🛡️ Configuring Nginx for Direct Access..."

# Simple Nginx config for direct IP access + vectabase.com
cat <<EOF | sudo tee /etc/nginx/sites-available/vectabase
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

if [ ! -f /etc/nginx/sites-enabled/vectabase ]; then
    sudo ln -s /etc/nginx/sites-available/vectabase /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default 2>/dev/null
fi

sudo nginx -t && sudo systemctl restart nginx

# 5. Application Launch (PM2)
echo "⚡ Restarting Vectabase with PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# We use "npm run start" to ensure Next.js uses the production build
pm2 delete vectabase 2>/dev/null || true
pm2 start "npm run start" --name vectabase

# 6. Whitelisting Service (Bot) - Robust Startup
echo "🤖 Starting Whitelisting Service..."

# Clean up any duplicate PM2 processes first
pm2 delete "whitelisting service" 2>/dev/null || true
pm2 delete "discord-roblox-whitelist-bot" 2>/dev/null || true

# Use absolute path - adjust if your VPS structure is different
BOT_DIR="/var/www/react-app/whitelisting_service"
if [ -d "$BOT_DIR" ]; then
    cd "$BOT_DIR"
    
    # Clean install to fix ESM/module issues
    echo "📦 Clean installing bot dependencies..."
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm install
    
    # Stop any existing process
    pm2 delete "whitelisting service" 2>/dev/null || true
    
    # Method 1: Try with ecosystem config
    echo "🔄 Trying ecosystem.config.cjs..."
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs --env production
        sleep 3
        if pm2 show "discord-roblox-whitelist-bot" 2>/dev/null | grep -q "online"; then
            echo "✅ Bot started with ecosystem config!"
        else
            echo "⚠️ Ecosystem config failed, trying direct start..."
            pm2 delete "discord-roblox-whitelist-bot" 2>/dev/null || true
            
            # Method 2: Direct node with ESM fix
            echo "🔄 Trying direct node start..."
            pm2 start src/index.js --name "whitelisting service" --node-args="--experimental-specifier-resolution=node"
            sleep 3
        fi
    else
        # Method 2: Direct start
        pm2 start src/index.js --name "whitelisting service" --node-args="--experimental-specifier-resolution=node"
        sleep 3
    fi
    
    # Check status and show logs
    echo "📋 Bot Status:"
    pm2 list
    echo ""
    echo "📜 Last 20 lines of bot logs:"
    pm2 logs "whitelisting service" --lines 20 --nostream 2>/dev/null || pm2 logs "discord-roblox-whitelist-bot" --lines 20 --nostream 2>/dev/null || echo "No logs available yet"
    
    # Check Vectabase status
    echo ""
    echo "📋 Vectabase Backend Status:"
    pm2 list | grep "vectabase"
    echo ""
    echo "📜 Last 20 lines of Vectabase logs:"
    pm2 logs "vectabase" --lines 20 --nostream 2>/dev/null || echo "No logs available for vectabase"
    
    pm2 save
    cd - > /dev/null
else
    echo "⚠️ Whitelisting service directory not found at $BOT_DIR"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Deployment COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo "🔗 Domain: http://vectabase.com (or your VPS IP)"
echo "🔐 Access: Direct access enabled (no password required)"
echo "🤖 Bot: Process name: 'discord-roblox-whitelist-bot'"
echo "📜 Logs: pm2 logs \"discord-roblox-whitelist-bot\""
echo "═══════════════════════════════════════════════════════════"
