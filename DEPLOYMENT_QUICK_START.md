# 🚀 Quick Deployment Guide

## Choose Your Deployment Method

### 🥇 **Easiest: Railway or Render (Recommended for Beginners)**
- ✅ Automatic SSL/HTTPS
- ✅ Free tier available
- ✅ Deploys from GitHub automatically
- ✅ No server management needed
- ⏱️ Setup time: 15-30 minutes

### 🥈 **Most Control: VPS (DigitalOcean, Linode, Vultr)**
- ✅ Full server control
- ✅ Custom configurations
- ✅ Best for production
- ⏱️ Setup time: 1-2 hours

### 🥉 **Simple: Shared Hosting (Hostinger, SiteGround)**
- ✅ Managed hosting
- ✅ Easy setup
- ⚠️ May have limitations
- ⏱️ Setup time: 30-60 minutes

---

## 🚀 Option 1: Deploy to Railway (EASIEST)

### Step 1: Sign Up
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your repository: `Vinzor11/HR`
3. Railway will auto-detect Laravel

### Step 3: Add Database
1. Click "New" → "Database" → "MySQL"
2. Railway creates database automatically
3. Copy the connection details

### Step 4: Configure Environment Variables
In Railway dashboard, go to "Variables" and add:

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
DB_PASSWORD=your_password_from_step_3

SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_DRIVER=file
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@essu.edu.ph
MAIL_FROM_NAME="ESSU HRMS"
```

### Step 5: Configure Build Settings
Railway auto-detects, but verify:

**Build Command:**
```bash
composer install --optimize-autoloader --no-dev && npm install && npm run build
```

**Start Command:**
```bash
php artisan migrate --force && php artisan passport:keys && php artisan serve --host=0.0.0.0 --port=$PORT
```

### Step 6: Deploy
1. Railway automatically deploys
2. Wait for deployment (5-10 minutes)
3. Get your URL: `https://your-app.railway.app`

### Step 7: Run Initial Setup
After first deployment, run these commands via Railway CLI or dashboard:

```bash
php artisan migrate --force
php artisan passport:keys
php artisan db:seed
```

**Done!** Your app is live with HTTPS! 🎉

---

## 🚀 Option 2: Deploy to VPS (DigitalOcean)

### Step 1: Create Droplet
1. Sign up at [DigitalOcean](https://digitalocean.com)
2. Create Droplet:
   - **OS:** Ubuntu 22.04 LTS
   - **Size:** 2GB RAM minimum ($12/month)
   - **Region:** Choose closest
   - **Authentication:** SSH key or password

### Step 2: Connect to Server
```bash
ssh root@your-server-ip
```

### Step 3: Run Setup Script
```bash
# Update system
apt update && apt upgrade -y

# Install PHP 8.2
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-common \
    php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring \
    php8.2-curl php8.2-xml php8.2-bcmath php8.2-intl

# Install Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install MySQL
apt install -y mysql-server
mysql_secure_installation
```

### Step 4: Create Database
```bash
mysql -u root -p
```

```sql
CREATE DATABASE hrms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON hrms_db.* TO 'hrms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 5: Deploy Code
```bash
# Clone repository
cd /var/www
git clone https://github.com/Vinzor11/HR.git hrms
cd hrms

# Install dependencies
composer install --optimize-autoloader --no-dev
npm install
npm run build

# Copy environment file
cp .env.example .env
nano .env  # Edit with your settings
```

### Step 6: Configure .env
```env
APP_NAME="ESSU HRMS"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hrms_db
DB_USERNAME=hrms_user
DB_PASSWORD=strong_password

SESSION_DRIVER=database
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

### Step 7: Run Setup Commands
```bash
php artisan key:generate
php artisan migrate --force
php artisan passport:keys
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

### Step 8: Configure Nginx
```bash
nano /etc/nginx/sites-available/hrms
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/hrms/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 9: Install SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

**Done!** Your app is live! 🎉

---

## 📋 Post-Deployment Checklist

After deployment, make sure to:

- [ ] Test login functionality
- [ ] Create OAuth clients at `/oauth/clients`
- [ ] Test OAuth flow
- [ ] Verify HTTPS is working
- [ ] Check error logs: `storage/logs/laravel.log`
- [ ] Set up database backups
- [ ] Configure email settings
- [ ] Test file uploads (certificates, documents)

---

## 🐛 Common Issues

### 500 Error
```bash
# Check logs
tail -f storage/logs/laravel.log

# Fix permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Clear cache
php artisan config:clear
php artisan cache:clear
```

### OAuth Not Working
- ✅ Ensure HTTPS is enabled
- ✅ Check `APP_URL` in `.env` matches your domain
- ✅ Run `php artisan passport:keys`
- ✅ Verify OAuth clients have correct redirect URIs

### Assets Not Loading
```bash
npm run build
php artisan storage:link
```

---

## 📚 Full Documentation

For detailed deployment instructions, see:
- `DEPLOYMENT_GUIDE_COMPLETE.md` - Comprehensive guide
- `OAUTH_PRODUCTION_DEPLOYMENT.md` - OAuth-specific setup

---

## 🆘 Need Help?

If you encounter issues:
1. Check the logs: `storage/logs/laravel.log`
2. Verify all environment variables
3. Ensure all dependencies are installed
4. Check server requirements are met

