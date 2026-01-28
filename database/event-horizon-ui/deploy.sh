#!/bin/bash

# Vectabase "Iron Curtain" Production Orchestrator 🧬🛰️
# Optimized for GitHub Deployment to vectabase.com/database

echo "🚀 Starting Production Sync & Deploy..."

# 1. GitHub Sync (Clean Slate)
echo "📥 Syncing code from GitHub..."
git reset --hard
git clean -fd
git pull origin main

# 2. Infrastructure Check (Node, Nginx, Postgres)
if ! command -v nginx &> /dev/null || ! command -v node &> /dev/null; then
    echo "📦 Installing core dependencies..."
    sudo apt-get update -y
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx apache2-utils postgresql postgresql-contrib
fi

# 2.5 Start Database (Docker Compose)
echo "🐘 Starting database services..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$DB_DIR/docker-compose.yml" ]; then
    cd "$DB_DIR"
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
echo "🛡️ Configuring Nginx for vectabase.com + /database..."

# Nginx config that routes:
# - vectabase.com/ -> Main React app on port 8080
# - vectabase.com/database -> Next.js database UI on port 3000
cat <<'EOF' | sudo tee /etc/nginx/sites-available/vectabase
server {
    listen 80;
    server_name vectabase.com www.vectabase.com 51.210.97.81;

    client_max_body_size 50M;

    # Database Admin UI (Next.js on port 3000)
    # This MUST come before the main location block
    location /database {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Database API routes
    location /database/api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js static files for database UI
    location /database/_next {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Main Vectabase site (React/Vite on port 8080)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main site API routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS server (if SSL is configured)
server {
    listen 443 ssl http2;
    server_name vectabase.com www.vectabase.com;

    # SSL certificates (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/vectabase.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vectabase.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    client_max_body_size 50M;

    # Database Admin UI (Next.js on port 3000)
    location /database {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /database/api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /database/_next {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Main Vectabase site (React/Vite on port 8080)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

if [ ! -f /etc/nginx/sites-enabled/vectabase ]; then
    sudo ln -sf /etc/nginx/sites-available/vectabase /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null
fi

# Test nginx config
echo "🔍 Testing Nginx configuration..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "✅ Nginx restarted successfully"
else
    echo "❌ Nginx config test failed! Check the configuration."
    exit 1
fi

# 5. Application Launch (PM2)
echo "⚡ Restarting Vectabase Database UI with PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Start the database UI (Next.js)
pm2 delete vectabase-db 2>/dev/null || true
pm2 start "npm run start" --name vectabase-db --cwd "$SCRIPT_DIR"

# 6. Whitelisting Service (Bot)
echo "🤖 Starting Whitelisting Service..."

pm2 delete "whitelisting service" 2>/dev/null || true
pm2 delete "discord-roblox-whitelist-bot" 2>/dev/null || true

BOT_DIR="/var/www/react-app/whitelisting_service"
if [ -d "$BOT_DIR" ]; then
    cd "$BOT_DIR"
    
    echo "📦 Clean installing bot dependencies..."
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm install
    
    pm2 delete "whitelisting service" 2>/dev/null || true
    
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs --env production
        sleep 3
        if pm2 show "discord-roblox-whitelist-bot" 2>/dev/null | grep -q "online"; then
            echo "✅ Bot started with ecosystem config!"
        else
            pm2 delete "discord-roblox-whitelist-bot" 2>/dev/null || true
            pm2 start src/index.js --name "whitelisting service" --node-args="--experimental-specifier-resolution=node"
        fi
    else
        pm2 start src/index.js --name "whitelisting service" --node-args="--experimental-specifier-resolution=node"
    fi
    
    pm2 save
    cd - > /dev/null
else
    echo "⚠️ Whitelisting service directory not found at $BOT_DIR"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Deployment COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🔗 Main Site:     https://vectabase.com"
echo "🗄️ Database UI:   https://vectabase.com/database"
echo "🔐 Admin Access:  Only authorized emails can access /database"
echo "🤖 Bot:           discord-roblox-whitelist-bot"
echo ""
echo "📋 PM2 Status:"
pm2 list
echo ""
echo "═══════════════════════════════════════════════════════════"
