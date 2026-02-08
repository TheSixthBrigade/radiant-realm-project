#!/bin/bash

# Vectabase Production Deployment Script
# SSL handled by Cloudflare - nginx only needs HTTP

set -e  # Exit on error

echo "=== Starting Production Sync & Deploy ==="

# Detect if we're in the main project or the event-horizon-ui folder
if [ -f "package.json" ] && grep -q '"name": "vectabase"' package.json 2>/dev/null; then
    BASE_DIR="$(pwd)"
elif [ -f "../../package.json" ]; then
    BASE_DIR="$(cd ../.. && pwd)"
else
    BASE_DIR="/var/www/react-app"
fi

DB_DIR="$BASE_DIR/database"
SCRIPT_DIR="$DB_DIR/event-horizon-ui"

echo "Directories:"
echo "   BASE_DIR: $BASE_DIR"
echo "   DB_DIR: $DB_DIR"
echo "   SCRIPT_DIR: $SCRIPT_DIR"

if [ ! -f "$BASE_DIR/package.json" ]; then
    echo "ERROR: Cannot find package.json in $BASE_DIR"
    echo "Please run this script from /var/www/react-app"
    exit 1
fi

# 1. GitHub Sync
echo "=== Syncing code from GitHub ==="
cd "$BASE_DIR"
git fetch origin
git reset --hard origin/main

# Make deploy script executable after pull
chmod +x "$SCRIPT_DIR/deploy.sh"

# 2. Infrastructure Check
if ! command -v nginx &> /dev/null || ! command -v node &> /dev/null; then
    echo "Installing core dependencies..."
    sudo apt-get update -y
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx postgresql-client
fi

# 3. Load secrets and export for Docker
echo "=== Loading secrets ==="
if [ -f "$BASE_DIR/secrets.env" ]; then
    source "$BASE_DIR/secrets.env"
    export GOOGLE_CLIENT_ID="${GOOGLE_ID:-}"
    export GOOGLE_CLIENT_SECRET="${GOOGLE_SECRET:-}"
    echo "Loaded Google credentials from secrets.env"
elif [ -f "$SCRIPT_DIR/.env.local" ]; then
    # Only load non-DB vars from .env.local
    export GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" "$SCRIPT_DIR/.env.local" | cut -d'=' -f2)
    export GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" "$SCRIPT_DIR/.env.local" | cut -d'=' -f2)
    echo "Loaded Google credentials from .env.local"
fi

# 4. Start Database (Docker Compose)
echo "=== Starting database services ==="
if [ -f "$DB_DIR/docker-compose.yml" ]; then
    cd "$DB_DIR"
    if ! command -v docker-compose &> /dev/null; then
        sudo apt-get install -y docker-compose
    fi
    
    echo "Stopping all containers..."
    sudo docker-compose down --remove-orphans 2>/dev/null || true
    
    echo "Removing old dashboard container and image..."
    sudo docker rm -f database_dashboard_1 database-dashboard-1 2>/dev/null || true
    sudo docker rmi -f database_dashboard database-dashboard 2>/dev/null || true
    
    echo "Pruning unused Docker resources..."
    sudo docker system prune -f
    
    echo "Building fresh dashboard with NEXT_PUBLIC_SITE_URL baked in..."
    sudo docker-compose build --no-cache \
        --build-arg NEXT_PUBLIC_SITE_URL=https://db.vectabase.com \
        --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
        dashboard
    
    echo "Starting all containers..."
    sudo -E docker-compose up -d
    
    cd "$BASE_DIR"
else
    echo "WARNING: docker-compose.yml not found at $DB_DIR/docker-compose.yml"
fi

# 5. Wait for PostgreSQL
echo "=== Setting up database ==="
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# ALWAYS use localhost for psql from host machine
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASS="your-super-secret-and-long-postgres-password"

# Test connection with retries
echo "Testing database connection..."
for i in 1 2 3 4 5; do
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection successful!"
        break
    else
        echo "⚠️ Database not ready yet, waiting... (attempt $i/5)"
        sleep 5
    fi
done

# 6. Apply schema ONLY ONCE (check for marker file)
SCHEMA_MARKER="$SCRIPT_DIR/.schema_applied"

if [ ! -f "$SCHEMA_MARKER" ]; then
    echo "=== Applying Event Horizon schema (first time only) ==="
    if [ -f "$SCRIPT_DIR/schema.sql" ]; then
        echo "Running schema.sql..."
        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/schema.sql" 2>&1
        touch "$SCHEMA_MARKER"
        echo "✅ Schema applied! Marker created - won't run again."
    else
        echo "❌ ERROR: schema.sql not found!"
        exit 1
    fi
else
    echo "=== Skipping schema (already applied) ==="
    echo "To re-apply schema, delete: $SCHEMA_MARKER"
fi

# 7. Set Production Environment in .env.local
echo "=== Setting production environment ==="
cat > "$SCRIPT_DIR/.env.local" << 'ENVFILE'
NEXT_PUBLIC_SITE_URL=https://db.vectabase.com
NEXT_PUBLIC_API_URL=http://localhost:8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-super-secret-and-long-postgres-password
JWT_SECRET=your-super-secret-jwt-signing-key-change-me
LATTICE_MASTER_KEY=mahmoudwenthardforameliasnowden
ENVFILE

# Append Google credentials if we have them
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> "$SCRIPT_DIR/.env.local"
fi
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> "$SCRIPT_DIR/.env.local"
fi

echo "Production .env.local created"

# 8. Build MAIN Website (vectabase.com on port 8080)
echo "=== Building MAIN Vectabase website ==="
cd "$BASE_DIR"
npm install
npm run build

# 9. Build Database UI (Next.js on port 3000) - Skip if using Docker
# The Docker container already has the built app, but we build for PM2 fallback
echo "=== Building Database UI ==="
cd "$SCRIPT_DIR"
npm install
npm run build 2>/dev/null || echo "Build handled by Docker"

# 10. Configure Nginx (HTTP only - Cloudflare handles SSL)
echo "=== Configuring Nginx ==="

sudo rm -f /etc/nginx/sites-enabled/vectabase 2>/dev/null
sudo rm -f /etc/nginx/sites-available/vectabase 2>/dev/null

cat <<'EOF' | sudo tee /etc/nginx/sites-available/vectabase
server {
    listen 80;
    server_name vectabase.com www.vectabase.com 51.210.97.81;

    client_max_body_size 50M;

    location /database {
        proxy_pass http://127.0.0.1:3000;
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
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /database/_next {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name db.vectabase.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
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
}
EOF

sudo ln -sf /etc/nginx/sites-available/vectabase /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null

echo "Testing Nginx configuration..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "Nginx restarted OK"
else
    echo "Nginx config failed!"
    sudo nginx -t
    exit 1
fi

# 11. Start Applications with PM2
echo "=== Starting applications with PM2 ==="
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 delete all 2>/dev/null || true

# Main Website - serve the dist folder on port 8080
echo "Starting Main Website on port 8080..."
cd "$BASE_DIR"
pm2 serve dist 8080 --name "vectabase-main" --spa

# Database UI - Next.js on port 3000
echo "Starting Database UI on port 3000..."
cd "$SCRIPT_DIR"
pm2 start npm --name "vectabase-db" -- run start

# API Server on port 3001
if [ -f "$BASE_DIR/server/index.js" ]; then
    echo "Starting API Server on port 3001..."
    cd "$BASE_DIR"
    pm2 start server/index.js --name "vectabase-api"
fi

# Whitelisting Bot
BOT_DIR="$BASE_DIR/whitelisting_service"
if [ -d "$BOT_DIR" ]; then
    echo "Starting Whitelisting Bot..."
    cd "$BOT_DIR"
    npm install
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs --env production
    else
        pm2 start src/index.js --name "whitelisting-bot"
    fi
fi

pm2 save

echo ""
echo "========================================"
echo "DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "Main Site:     https://vectabase.com (port 8080)"
echo "Database UI:   https://db.vectabase.com (port 3000)"
echo "API Server:    https://vectabase.com/api (port 3001)"
echo ""
echo "PM2 Status:"
pm2 list
echo ""
echo "========================================"
