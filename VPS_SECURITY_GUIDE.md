# VPS Security Guide for Vectabase

## 🔒 CRITICAL: Immediate Actions

### 1. Rotate ALL Exposed Secrets NOW

Your secrets have been exposed in code. Rotate these IMMEDIATELY:

```bash
# Discord Bot Token - Go to Discord Developer Portal
# https://discord.com/developers/applications/1452697259463540816/bot
# Click "Reset Token" and update your .env

# Roblox API Key - Go to Roblox Creator Dashboard
# https://create.roblox.com/credentials
# Revoke old key and create new one

# Payhip API Key - Go to Payhip Dashboard
# Settings > API > Generate new key

# Discord Client Secret - Discord Developer Portal
# OAuth2 section > Reset Secret
```

### 2. Update Environment Variables

After rotating secrets, update these files:

**On VPS - `/path/to/whitelsiting service/.env`:**
```env
DISCORD_TOKEN=your_new_token_here
DISCORD_CLIENT_ID=1452697259463540816
ROBLOX_API_KEY=your_new_key_here
ROBLOX_GROUP_ID=5451777
PAYHIP_API_KEY=your_new_key_here
DB_ENCRYPTION_KEY=generate_new_32_byte_hex_key
SUPABASE_URL=https://cmmeqzkbiiqqfvzkmkzt.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Supabase Edge Function Secrets:**
```bash
# Set via Supabase Dashboard > Project Settings > Edge Functions > Secrets
DISCORD_CLIENT_SECRET=your_new_secret_here
STRIPE_SECRET_KEY=your_stripe_secret
```

---

## 🛡️ VPS Security Hardening

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y fail2ban ufw unattended-upgrades
```

### Step 2: Configure Firewall (UFW)
```bash
# Reset and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 if using custom port)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS for web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow obfuscator API (internal only - see nginx config)
# DO NOT expose port 5050 directly!
# sudo ufw allow 5050/tcp  # DON'T DO THIS

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Step 3: Configure Fail2Ban
```bash
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Step 4: Secure SSH
```bash
sudo nano /etc/ssh/sshd_config
```

Change these settings:
```
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys only
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
sudo systemctl restart sshd
```

### Step 5: Install and Configure Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create config:
```bash
sudo nano /etc/nginx/sites-available/vectabase
```

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=obfuscator_limit:10m rate=2r/s;

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://discord.com wss://*.supabase.co; frame-src https://js.stripe.com;" always;

    # Main website
    location / {
        root /var/www/vectabase/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Obfuscator API - PROTECTED
    location /api/obfuscate {
        limit_req zone=obfuscator_limit burst=5 nodelay;
        
        # Only allow from your domain
        if ($http_origin !~* (https://your-domain\.com|https://www\.your-domain\.com)) {
            return 403;
        }
        
        proxy_pass http://127.0.0.1:5050/obfuscate;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout for obfuscation
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Health check (public)
    location /api/health {
        proxy_pass http://127.0.0.1:5050/health;
    }

    # Block direct access to sensitive paths
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|git|sql|py|js)$ {
        deny all;
    }
}
```

Enable and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/vectabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo systemctl restart nginx
```

### Step 6: Protect Obfuscator Files
```bash
# Set restrictive permissions on obfuscator directory
chmod 700 /path/to/whitelsiting\ service/new_obfuscator
chmod 600 /path/to/whitelsiting\ service/new_obfuscator/*.py
chmod 600 /path/to/whitelsiting\ service/new_obfuscator/core/*.py
chmod 600 /path/to/whitelsiting\ service/new_obfuscator/transforms/*.py
chmod 600 /path/to/whitelsiting\ service/new_obfuscator/vm/*.py

# Only the service user should access these
chown -R vectabase:vectabase /path/to/whitelsiting\ service/
```

### Step 7: Create Dedicated Service User
```bash
# Create user without login shell
sudo useradd -r -s /bin/false vectabase

# Set ownership
sudo chown -R vectabase:vectabase /path/to/whitelsiting\ service/
sudo chown -R vectabase:vectabase /var/www/vectabase/
```

### Step 8: Setup Systemd Services

**Discord Bot Service:**
```bash
sudo nano /etc/systemd/system/vectabase-bot.service
```

```ini
[Unit]
Description=Vectabase Discord Bot
After=network.target

[Service]
Type=simple
User=vectabase
WorkingDirectory=/path/to/whitelsiting service
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/path/to/whitelsiting service/data /path/to/whitelsiting service/logs

[Install]
WantedBy=multi-user.target
```

**Obfuscator API Service:**
```bash
sudo nano /etc/systemd/system/vectabase-obfuscator.service
```

```ini
[Unit]
Description=Vectabase Obfuscator API
After=network.target

[Service]
Type=simple
User=vectabase
WorkingDirectory=/path/to/whitelsiting service/new_obfuscator
ExecStart=/usr/bin/python3 obfuscator_api.py
Restart=always
RestartSec=10
Environment=OBFUSCATOR_API_KEY=your_secret_api_key_here

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Enable services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vectabase-bot vectabase-obfuscator
sudo systemctl start vectabase-bot vectabase-obfuscator
```

### Step 9: Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/vectabase
```

```
/path/to/whitelsiting service/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 vectabase vectabase
}
```

### Step 10: Setup Automatic Security Updates
```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🔐 Additional Security Measures

### Database Security
- ✅ RLS policies applied (done in migration)
- ✅ Indexes for performance (done in migration)
- ✅ Audit logging table created

### API Security
- ✅ Rate limiting on obfuscator API
- ✅ Origin validation
- ✅ Input size limits
- ✅ Dangerous pattern blocking

### Monitoring (Optional but Recommended)
```bash
# Install monitoring
sudo apt install -y htop iotop nethogs

# Setup basic monitoring script
cat > /home/vectabase/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
uptime
echo ""
echo "=== Memory ==="
free -h
echo ""
echo "=== Disk ==="
df -h /
echo ""
echo "=== Services ==="
systemctl status vectabase-bot --no-pager | head -5
systemctl status vectabase-obfuscator --no-pager | head -5
echo ""
echo "=== Recent Auth Failures ==="
sudo grep "Failed password" /var/log/auth.log | tail -5
EOF
chmod +x /home/vectabase/monitor.sh
```

---

## ⚠️ Security Checklist

- [ ] Rotated Discord Bot Token
- [ ] Rotated Discord Client Secret
- [ ] Rotated Roblox API Key
- [ ] Rotated Payhip API Key
- [ ] Generated new DB Encryption Key
- [ ] Set Supabase Edge Function secrets
- [ ] Configured UFW firewall
- [ ] Configured Fail2Ban
- [ ] Secured SSH (key-only auth)
- [ ] Setup Nginx reverse proxy with SSL
- [ ] Protected obfuscator files (chmod 700)
- [ ] Created dedicated service user
- [ ] Setup systemd services
- [ ] Configured log rotation
- [ ] Enabled automatic security updates

---

## 🚨 If You Suspect a Breach

1. **Immediately rotate ALL secrets**
2. **Check Supabase audit logs**
3. **Review VPS auth logs**: `sudo grep "Accepted\|Failed" /var/log/auth.log`
4. **Check for unauthorized processes**: `ps aux | grep -v root`
5. **Review network connections**: `sudo netstat -tulpn`
6. **Consider rebuilding VPS from scratch if compromised**
