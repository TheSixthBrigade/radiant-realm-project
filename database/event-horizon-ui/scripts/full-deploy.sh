#!/bin/bash
# Full deployment script - syncs code AND database schema to production
# Run this from your LOCAL machine, NOT the VPS

set -e

VPS_USER="ubuntu"
VPS_HOST="your-vps-ip"  # Replace with actual VPS IP
VPS_PATH="/var/www/react-app"
SSH_KEY="~/.ssh/id_ed25519"

echo "=========================================="
echo "  VECTABASE FULL DEPLOYMENT"
echo "=========================================="

# Step 1: Push local changes to GitHub
echo ""
echo "[1/6] Pushing local changes to GitHub..."
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

# Step 2: Dump local database schema
echo ""
echo "[2/6] Dumping local database schema..."
node scripts/dump-database.js

# Step 3: SSH to VPS and pull latest code
echo ""
echo "[3/6] Pulling latest code on VPS..."
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /var/www/react-app
sudo git fetch origin
sudo git reset --hard origin/main
ENDSSH

# Step 4: Apply database migrations on VPS
echo ""
echo "[4/6] Applying database migrations on VPS..."
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /var/www/react-app/database/event-horizon-ui

# Apply all migrations in order
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying: $migration"
        sudo docker exec -i database_postgres_1 psql -U postgres -d postgres < "$migration" 2>/dev/null || true
    fi
done

echo "Migrations complete!"
ENDSSH

# Step 5: Rebuild and restart dashboard container
echo ""
echo "[5/6] Rebuilding dashboard container..."
ssh -i $SSH_KEY $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /var/www/react-app

# Fully nuke the old container and image
sudo docker stop database_dashboard_1 2>/dev/null || true
sudo docker rm database_dashboard_1 2>/dev/null || true
sudo docker rmi database_dashboard:latest 2>/dev/null || true

# Rebuild fresh
cd database
sudo docker-compose build --no-cache dashboard
sudo docker-compose up -d dashboard

echo "Dashboard rebuilt!"
ENDSSH

# Step 6: Verify deployment
echo ""
echo "[6/6] Verifying deployment..."
sleep 5
curl -s -o /dev/null -w "%{http_code}" https://db.vectabase.com/api/health || echo "Health check endpoint not found"

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Dashboard: https://db.vectabase.com"
echo ""
