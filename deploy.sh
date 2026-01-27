#!/bin/bash
# VECTABASE ULTIMATE PRODUCTION DEPLOYER 🚀
# consolidated fix for duplicates, ESM errors, and missing modules

# 1. CLEANUP OLD STATE
echo "🧨 Nuking old process list..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

ROOT_DIR="/var/www/react-app"
BOT_DIR="$ROOT_DIR/whitelisting_service"
API_DIR="$ROOT_DIR/database/event-horizon-ui"

# 2. SYNC CODE
echo "📥 Syncing latest code from GitHub..."
cd "$ROOT_DIR" || exit
if [ ! -d ".git" ]; then
    echo "🔍 Git repo not found, forcing initialization..."
    git init
    git remote add origin https://github.com/TheSixthBrigade/radiant-realm-project.git
    git fetch --all
    git reset --hard origin/main
else
    echo "🔄 Pulling latest changes..."
    git reset --hard && git clean -fd && git pull origin main
fi

# 3. INSTALL DEPENDENCIES (CLEAN)
echo "🏗️ Setting up Main App dependencies..."
npm install 

echo "🏗️ Setting up Website build..."
# Ensure production mode for build
NODE_ENV=production npm run build

if [ -d "$API_DIR" ]; then
    echo "🏗️ Setting up Backend API..."
    cd "$API_DIR" && npm install && npm run build
fi

if [ -d "$BOT_DIR" ]; then
    echo "🏗️ Building Whitelisting Bot..."
    cd "$BOT_DIR"
    # Aggressively fix the broken import that keeps coming back
    sed -i "s|from '@supabase/supabase-js/dist/main/index.js'|from '@supabase/supabase-js'|g" src/config/supabaseConfig.js
    rm -rf node_modules package-lock.json
    npm install
fi

# 4. CONFIGURE NGINX
echo "🛡️ Configuring Nginx..."
cat <<NGINX | sudo tee /etc/nginx/sites-available/vectabase
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
NGINX

sudo ln -sf /etc/nginx/sites-available/vectabase /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null
sudo nginx -t && sudo systemctl restart nginx

# 5. LAUNCH SERVICES
echo "⚡ Launching Services..."
cd "$ROOT_DIR"

# Launch Backend/Website Unified process
# We use NODE_ENV=production to ensure Vite plugin stays OFF
NODE_ENV=production pm2 start start-all.cjs --name "vectabase-backend"

# Launch Bot separately
if [ -d "$BOT_DIR" ]; then
    cd "$BOT_DIR"
    # Use direct start to avoid ecosystem.config confusion
    pm2 start src/index.js --name "discord-roblox-whitelist-bot" --node-args="--experimental-specifier-resolution=node"
fi

pm2 save

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo "🔗 URL: http://$(curl -s ifconfig.me) (Port 80)"
echo "🤖 Bot Logs: pm2 logs discord-roblox-whitelist-bot"
echo "💾 Backend Logs: pm2 logs vectabase-backend"
echo "═══════════════════════════════════════════════════════════"
