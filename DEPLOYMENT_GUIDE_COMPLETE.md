# Complete Laravel Deployment Guide

A step-by-step guide to deploy your Laravel HR system with OAuth to production.

---

## 🎯 Choose Your Deployment Method

### Option 1: VPS (Virtual Private Server) - Most Control
- **Providers:** DigitalOcean, Linode, Vultr, AWS EC2
- **Cost:** $5-20/month
- **Best for:** Full control, learning, custom setup

### Option 2: Shared Hosting - Easiest
- **Providers:** Hostinger, SiteGround, A2 Hosting
- **Cost:** $3-10/month
- **Best for:** Simple deployment, managed hosting

### Option 3: Cloud Platform - Easiest Deployment
- **Providers:** Railway, Render, Fly.io
- **Cost:** Free tier available, then $5-20/month
- **Best for:** Quick deployment, automatic SSL

### Option 4: University Server - Free
- **Your IT department's server**
- **Cost:** Free
- **Best for:** University projects

---

## 📋 Pre-Deployment Checklist

Before you start:

- [ ] Code is ready (tested locally)
- [ ] Database backup created
- [ ] `.env.example` is up to date
- [ ] All migrations tested
- [ ] OAuth tested locally
- [ ] Domain/subdomain ready (or will use IP)

---

## 🚀 Method 1: Deploy to VPS (DigitalOcean/Linode/Vultr)

### Step 1: Create VPS Server

1. **Sign up** at DigitalOcean/Linode/Vultr
2. **Create Droplet/Instance:**
   - OS: Ubuntu 22.04 LTS
   - Size: 2GB RAM minimum (4GB recommended)
   - Region: Choose closest to users
   - Add SSH key (or use password)

3. **Note your server IP:** `123.45.67.89`

### Step 2: Connect to Server

**Windows (PowerShell):**
```powershell
ssh root@123.45.67.89
```

**Or use PuTTY:**
- Host: `123.45.67.89`
- Port: `22`
- Username: `root`

### Step 3: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Create non-root user (recommended)
adduser laravel
usermod -aG sudo laravel
su - laravel

# Install required software
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 and extensions
sudo apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-common \
    php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl \
    php8.2-xml php8.2-bcmath php8.2-intl

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Git
sudo apt install -y git
```

### Step 4: Set Up Database

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE hrms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON hrms_db.* TO 'hrms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 5: Deploy Your Code

**Option A: Using Git (Recommended)**

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
sudo git clone https://github.com/yourusername/your-repo.git hrms
# OR if using SSH: git clone git@github.com:yourusername/your-repo.git hrms

# Set ownership
sudo chown -R laravel:www-data hrms
cd hrms
```

**Option B: Using FTP/SFTP**

1. Use FileZilla or WinSCP
2. Connect to server: `sftp://123.45.67.89`
3. Upload all files to `/var/www/hrms`

### Step 6: Install Dependencies

```bash
cd /var/www/hrms

# Install PHP dependencies
composer install --optimize-autoloader --no-dev

# Install Node dependencies
npm install

# Build assets
npm run build
```

### Step 7: Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Edit environment file
nano .env
```

**Update `.env` with production values:**

```env
APP_NAME="ESSU HRMS"
APP_ENV=production
APP_KEY=base64:... (generated above)
APP_DEBUG=false
APP_URL=https://hr.essu.edu.ph

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hrms_db
DB_USERNAME=hrms_user
DB_PASSWORD=strong_password_here

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
SESSION_DRIVER=database
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@essu.edu.ph"
MAIL_FROM_NAME="${APP_NAME}"
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 8: Run Migrations and Generate Passport Keys

```bash
# Run migrations
php artisan migrate --force

# Generate Passport keys (IMPORTANT for OAuth!)
php artisan passport:keys

# Create storage link
php artisan storage:link
```

### Step 9: Set Permissions

```bash
# Set proper permissions
sudo chown -R laravel:www-data /var/www/hrms
sudo chmod -R 775 /var/www/hrms/storage
sudo chmod -R 775 /var/www/hrms/bootstrap/cache
```

### Step 10: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hrms
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name hr.essu.edu.ph;  # Change to your domain or IP
    
    root /var/www/hrms/public;
    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

**Save and enable:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 11: Set Up SSL (HTTPS) - Required for OAuth!

**Using Let's Encrypt (Free):**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d hr.essu.edu.ph

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS
```

**If using IP address only:**

```bash
# Install Certbot
sudo apt install -y certbot

# Get certificate (certbot will give you instructions)
sudo certbot certonly --standalone
```

### Step 12: Optimize Laravel

```bash
cd /var/www/hrms

# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer dump-autoload --optimize
```

### Step 13: Set Up Queue Worker (If Using Queues)

```bash
# Create systemd service
sudo nano /etc/systemd/system/hrms-queue.service
```

**Paste:**

```ini
[Unit]
Description=HRMS Queue Worker
After=network.target

[Service]
User=laravel
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/hrms/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl enable hrms-queue
sudo systemctl start hrms-queue
```

### Step 14: Test Your Deployment

1. **Visit your site:** `https://hr.essu.edu.ph`
2. **Check OAuth endpoints:**
   - `https://hr.essu.edu.ph/.well-known/openid-configuration`
   - `https://hr.essu.edu.ph/oauth/clients`
3. **Test login**
4. **Create OAuth client**

---

## 🚀 Method 2: Deploy to Cloud Platform (Railway/Render)

### Using Railway (Easiest)

#### Step 1: Sign Up and Create Project

1. Go to: railway.app
2. Sign up (free tier available)
3. Click "New Project"
4. Select "Deploy from GitHub repo" or "Empty Project"

#### Step 2: Connect Repository

1. Connect your GitHub repository
2. Railway will detect it's a Laravel app

#### Step 3: Configure Environment Variables

In Railway dashboard, add these variables:

```env
APP_NAME=ESSU HRMS
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app.railway.app

DB_CONNECTION=mysql
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=3306
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=your_password

# Add other variables from your .env
```

#### Step 4: Add Database

1. Click "New" → "Database" → "MySQL"
2. Railway creates database automatically
3. Copy connection details to environment variables

#### Step 5: Configure Build Settings

Railway will auto-detect, but you can customize:

**Build Command:**
```bash
composer install --optimize-autoloader --no-dev && npm install && npm run build
```

**Start Command:**
```bash
php artisan migrate --force && php artisan passport:keys && php artisan serve --host=0.0.0.0 --port=$PORT
```

#### Step 6: Deploy

1. Railway automatically deploys on git push
2. Or click "Deploy" button
3. Wait for deployment to complete

#### Step 7: Get Your URL

- Railway provides: `https://your-app.railway.app`
- SSL is automatic!
- Use this URL for OAuth

#### Step 8: Run Migrations and Generate Keys

**Option A: Via Railway CLI:**
```bash
railway run php artisan migrate --force
railway run php artisan passport:keys
```

**Option B: Via Railway Dashboard:**
1. Go to your service
2. Click "Deployments" → "View Logs"
3. Use "Run Command" feature

---

### Using Render

#### Step 1: Sign Up

1. Go to: render.com
2. Sign up (free tier available)

#### Step 2: Create Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** hrms
   - **Environment:** PHP
   - **Build Command:** `composer install --optimize-autoloader --no-dev && npm install && npm run build`
   - **Start Command:** `php artisan serve --host=0.0.0.0 --port=10000`

#### Step 3: Add Database

1. Click "New" → "PostgreSQL" (or MySQL)
2. Copy connection details

#### Step 4: Set Environment Variables

Add all variables from your `.env` file

#### Step 5: Deploy

1. Render auto-deploys on git push
2. Get your URL: `https://hrms.onrender.com`
3. SSL is automatic!

---

## 🚀 Method 3: Deploy to Shared Hosting

### Step 1: Get Hosting Account

1. Sign up with Hostinger/SiteGround/etc.
2. Get FTP credentials
3. Note your domain: `hr.essu.edu.ph`

### Step 2: Upload Files

**Using FileZilla:**

1. Connect via FTP
2. Upload all files to `public_html` folder
3. **Important:** Upload `.env` file separately (it's hidden)

### Step 3: Configure Database

1. Go to hosting control panel (cPanel)
2. Create MySQL database
3. Create database user
4. Note credentials

### Step 4: Update `.env`

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://hr.essu.edu.ph

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Step 5: Run Commands via SSH

**If SSH access available:**

```bash
cd public_html
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan passport:keys
php artisan config:cache
php artisan route:cache
```

**If no SSH, use hosting control panel:**
- Most hosts have "Terminal" or "SSH" in cPanel
- Or use "Cron Jobs" to run commands

### Step 6: Set Permissions

Via File Manager or FTP:
- `storage/` → 755
- `bootstrap/cache/` → 755

---

## 🔧 Post-Deployment Steps

### 1. Create OAuth Clients

1. Login to your deployed system
2. Go to: `https://hr.essu.edu.ph/oauth/clients`
3. Create clients for other systems with production URLs:
   - `https://hims.essu.edu.ph/oauth/callback`
   - `https://accounting.essu.edu.ph/oauth/callback`

### 2. Test OAuth Flow

1. Test authorization endpoint
2. Test token exchange
3. Test userinfo endpoint

### 3. Set Up Monitoring

- Monitor error logs
- Set up uptime monitoring
- Configure backups

### 4. Set Up Backups

```bash
# Create backup script
nano /var/www/hrms/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u hrms_user -p'password' hrms_db > /backups/hrms_$DATE.sql
tar -czf /backups/files_$DATE.tar.gz /var/www/hrms/storage
```

```bash
chmod +x backup.sh

# Add to crontab (daily backup)
crontab -e
# Add: 0 2 * * * /var/www/hrms/backup.sh
```

---

## 🐛 Troubleshooting

### Issue: 500 Internal Server Error

**Check:**
```bash
# Check Laravel logs
tail -f storage/logs/laravel.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check PHP-FPM logs
sudo tail -f /var/log/php8.2-fpm.log
```

**Common fixes:**
- Permissions: `sudo chmod -R 775 storage bootstrap/cache`
- Clear cache: `php artisan config:clear && php artisan cache:clear`
- Check `.env` file exists and is correct

### Issue: OAuth Not Working

**Check:**
- HTTPS is enabled (required!)
- `APP_URL` is correct in `.env`
- Passport keys generated: `php artisan passport:keys`
- OAuth clients have correct redirect URIs

### Issue: Database Connection Failed

**Check:**
- Database credentials in `.env`
- Database exists
- User has permissions
- Firewall allows connections

### Issue: Assets Not Loading

**Fix:**
```bash
npm run build
php artisan storage:link
```

---

## 📋 Quick Deployment Checklist

- [ ] Server/hosting account ready
- [ ] Domain/subdomain configured
- [ ] Code uploaded to server
- [ ] Dependencies installed (`composer install`, `npm install`)
- [ ] Assets built (`npm run build`)
- [ ] `.env` configured with production values
- [ ] Database created and configured
- [ ] Migrations run (`php artisan migrate`)
- [ ] Passport keys generated (`php artisan passport:keys`)
- [ ] Permissions set correctly
- [ ] Web server configured (Nginx/Apache)
- [ ] SSL certificate installed (HTTPS)
- [ ] Laravel optimized (`config:cache`, `route:cache`)
- [ ] OAuth clients created with production URLs
- [ ] OAuth flow tested
- [ ] Backups configured
- [ ] Monitoring set up

---

## 🎯 Which Method Should You Choose?

### Choose VPS if:
- ✅ You want full control
- ✅ You want to learn server management
- ✅ You need custom configurations
- ✅ You have time to set up

### Choose Cloud Platform if:
- ✅ You want easiest deployment
- ✅ You want automatic SSL
- ✅ You want quick setup
- ✅ You don't need full server control

### Choose Shared Hosting if:
- ✅ You want managed hosting
- ✅ You don't want to manage server
- ✅ You have budget constraints
- ✅ Simple setup is priority

---

## ✅ You're Ready to Deploy!

Follow the method that fits your needs. The VPS method gives you the most control, while cloud platforms are the easiest.

**Need help with a specific step?** Let me know which method you're using and I can guide you through it!

