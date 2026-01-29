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
# 1.5. DATABASE MIGRATIONS
########################
echo "🗄️ Running database migrations..."

# Check if PostgreSQL is accessible
if command -v psql &> /dev/null; then
    # Run main Vectabase migrations
    if [ -f "$BASE_DIR/scripts/apply-migrations.js" ]; then
        echo "📄 Applying main Vectabase schema and migrations..."
        cd "$BASE_DIR"
        node scripts/apply-migrations.js || echo "⚠️ Migration warnings (may be OK if tables exist)"
    fi
    
    # Run Event Horizon UI schema (for db.vectabase.com)
    if [ -f "$UI_DIR/schema.sql" ]; then
        echo "📄 Applying Event Horizon UI schema..."
        # Source the Event Horizon env if it exists
        if [ -f "$UI_DIR/.env.local" ]; then
            source "$UI_DIR/.env.local"
        fi
        EH_DB_HOST="${DB_HOST:-localhost}"
        EH_DB_PORT="${DB_PORT:-5432}"
        EH_DB_NAME="${DB_NAME:-postgres}"
        EH_DB_USER="${DB_USER:-postgres}"
        EH_DB_PASS="${DB_PASSWORD:-postgres}"
        
        PGPASSWORD="$EH_DB_PASS" psql -h "$EH_DB_HOST" -p "$EH_DB_PORT" -U "$EH_DB_USER" -d "$EH_DB_NAME" -f "$UI_DIR/schema.sql" 2>&1 || echo "⚠️ Event Horizon schema may already exist (OK)"
        echo "✅ Event Horizon schema applied"
    fi
    
    # Import seed data if it exists and DB is empty
    if [ -f "$BASE_DIR/database/seed-data.sql" ]; then
        echo "🌱 Checking for seed data..."
        # Only seed if users table is empty
        USER_COUNT=$(psql -h localhost -U vectabase_admin -d vectabase -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
        if [ "$USER_COUNT" -lt "1" ]; then
            echo "📥 Importing seed data..."
            psql -h localhost -U vectabase_admin -d vectabase -f "$BASE_DIR/database/seed-data.sql" || true
        else
            echo "✅ Database already has data, skipping seed"
        fi
    fi
else
    echo "⚠️ psql not found, skipping direct migrations"
    echo "   Database will be managed by Docker containers"
fi

cd "$BASE_DIR"

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
echo "🐳 Deploying Services..."

# 3a. Start Main Website (Host Process)
echo "🌐 Building Main Website..."
cd "$BASE_DIR"
npm install
npm run build

echo "⚡ Starting Main Website on 8080..."
# Use PM2 to serve static build on port 8080
pm2 delete "vectabase-main" 2>/dev/null || true
pm2 serve dist 8080 --name "vectabase-main" --spa

# 3b. Start Database UI (Docker)
echo "📦 Deploying Database Interface..."
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
