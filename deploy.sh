#!/usr/bin/env bash
set -e

########################
# CONFIGURATION
########################
BRANCH="main"
BASE_DIR="/var/www/react-app"
DB_DIR="$BASE_DIR/database"
UI_DIR="$DB_DIR/event-horizon-ui"
BOT_DIR="$BASE_DIR/whitelisting_service"
OBF_DIR="$BOT_DIR/new_obfuscator"

# OAUTH SECRETS (Loaded from secrets.env)
if [ -f "$BASE_DIR/secrets.env" ]; then
    source "$BASE_DIR/secrets.env"
else
    echo "❌ ERROR: secrets.env not found!"
    echo "   Please run the setup command provided by the developer."
    exit 1
fi

echo "=============================="
echo "🚀 VECTABASE PRODUCTION DEPLOY"
echo "=============================="

########################
# 1. GIT SYNC
########################
echo "📥 Syncing code from GitHub..."
cd "$BASE_DIR"

# Ensure git is initialized and clean
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

########################
# 2. ENVIRONMENT INJECTION
########################
echo "🔑 Configuring secrets..."

# Ensure UI directory exists
mkdir -p "$UI_DIR"

# Write .env.local for Next.js
cat > "$UI_DIR/.env.local" <<EOF
GOOGLE_CLIENT_ID=$GOOGLE_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_SECRET
ROBLOX_CLIENT_ID=$ROBLOX_ID
ROBLOX_CLIENT_SECRET=$ROBLOX_SECRET
NEXT_PUBLIC_SITE_URL=https://vectabase.com/database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-super-secret-and-long-postgres-password
EOF

echo "✅ .env.local created with OAuth keys"

########################
# 3. DOCKER DEPLOYMENT
########################
echo "🐳 Deploying Docker stack..."
cd "$DB_DIR"

# verify nginx config is a file and not a dir
if [ -d "nginx.conf" ]; then
    echo "⚠️  Fixing nginx.conf directory issue..."
    rm -rf nginx.conf
fi

if [ ! -f "nginx.conf" ]; then
    echo "📝 Creating default nginx.conf..."
    cat > nginx.conf <<EOF
server {
    listen 3000;
    location / {
        proxy_pass http://postgrest:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
fi

echo "🧹 Cleaning up..."
docker-compose down --remove-orphans || true
docker system prune -f

echo "🔨 Building..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

########################
# 4. SYSTEMD: DISCORD BOT
########################
echo "🤖 Configuring Discord Bot Service..."

# Kill any old PM2 instances
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pkill -f "node src/index.js" || true

# Write Service File
sudo bash -c "cat > /etc/systemd/system/vectabase-bot.service <<EOF
[Unit]
Description=Vectabase Discord Roblox Whitelist Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$BOT_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF"

########################
# 5. SYSTEMD: OBFUSCATOR API
########################
echo "🐍 Configuring Obfuscator API Service..."

# Kill any old instances
pkill -f "python3 obfuscator_api.py" || true

# Write Service File
sudo bash -c "cat > /etc/systemd/system/vectabase-obfuscator.service <<EOF
[Unit]
Description=Vectabase Obfuscator API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$OBF_DIR
ExecStart=/usr/bin/python3 obfuscator_api.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF"

########################
# 6. RELOAD & RESTART SERVICES
########################
echo "🔄 Reloading Systemd..."

sudo systemctl daemon-reload

echo "▶️ Starting Bot..."
sudo systemctl enable vectabase-bot
sudo systemctl restart vectabase-bot

echo "▶️ Starting Obfuscator..."
sudo systemctl enable vectabase-obfuscator
sudo systemctl restart vectabase-obfuscator

########################
# STATUS REPORT
########################
echo "=============================="
echo "✅ DEPLOY COMPLETE"
echo "=============================="
echo "📜 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📜 System Services:"
systemctl status vectabase-bot --no-pager | grep "Active:"
systemctl status vectabase-obfuscator --no-pager | grep "Active:"
