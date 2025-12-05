# OAuth Production Deployment Guide

## ✅ Yes, You Need to Deploy!

For other systems to use your OAuth feature, you need to deploy your HR system to a server with:
- **HTTPS** (required for OAuth security)
- **Public domain** (so other systems can reach it)
- **Proper configuration**

---

## 🚀 Deployment Checklist

### 1. Server Requirements

- ✅ PHP 8.2+ with required extensions
- ✅ MySQL/PostgreSQL database
- ✅ HTTPS/SSL certificate (Let's Encrypt is free)
- ✅ Web server (Nginx or Apache)
- ✅ Domain name (e.g., `hr.youruniversity.edu`)

### 2. Environment Configuration

Update your `.env` file on the production server:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://hr.youruniversity.edu

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Session (important for OAuth)
SESSION_DRIVER=database
SESSION_LIFETIME=120

# Cache
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis

# Passport Keys (generate on production)
# Run: php artisan passport:keys
```

### 3. Generate Passport Keys on Production

**IMPORTANT:** Generate new OAuth keys on your production server:

```bash
php artisan passport:keys
```

This creates:
- `storage/oauth-private.key`
- `storage/oauth-public.key`

**⚠️ Never copy keys from localhost to production!**

### 4. Update OAuth Client Redirect URIs

After deployment, update all OAuth clients with production URLs:

**For each client:**
- Old: `http://localhost:3001/oauth/callback`
- New: `https://accounting.youruniversity.edu/oauth/callback`

**Update via database or recreate clients:**

```php
// Update existing client
$client = \Laravel\Passport\Client::find('client-id');
$client->redirect_uris = ['https://accounting.youruniversity.edu/oauth/callback'];
$client->save();
```

### 5. CORS Configuration

Create `config/cors.php` if it doesn't exist:

```bash
php artisan config:publish cors
```

Configure allowed origins for your accounting/payroll systems:

```php
'paths' => ['api/*', 'oauth/*'],
'allowed_origins' => [
    'https://accounting.youruniversity.edu',
    'https://payroll.youruniversity.edu',
],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

### 6. Security Settings

**In `bootstrap/app.php`** (already configured):
- ✅ OAuth token endpoint excluded from CSRF
- ✅ Proper middleware setup

**Additional security:**
- Use strong client secrets
- Enable rate limiting
- Monitor OAuth access logs
- Regularly rotate client secrets

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy Your Application

1. **Upload code to server** (via Git, FTP, etc.)
2. **Install dependencies:**
   ```bash
   composer install --optimize-autoloader --no-dev
   npm install
   npm run build
   ```
3. **Set up environment:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. **Configure `.env`** with production values
5. **Run migrations:**
   ```bash
   php artisan migrate --force
   ```
6. **Generate Passport keys:**
   ```bash
   php artisan passport:keys
   ```
7. **Optimize:**
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

### Step 2: Configure Web Server

**Nginx Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name hr.youruniversity.edu;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /path/to/your/app/public;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # OAuth endpoints
    location ~ ^/oauth/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # OpenID Connect discovery
    location ~ ^/.well-known/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

**Apache Example:**

Ensure `.htaccess` is working and HTTPS is configured.

### Step 3: Create Production OAuth Clients

1. **Login to production HR system**
2. **Go to:** `https://hr.youruniversity.edu/oauth/clients`
3. **Create clients for each system:**
   - **Accounting System:**
     - Name: `Accounting System`
     - Redirect URI: `https://accounting.youruniversity.edu/oauth/callback`
   - **Payroll System:**
     - Name: `Payroll System`
     - Redirect URI: `https://payroll.youruniversity.edu/oauth/callback`
4. **Save Client ID and Secret** for each system

### Step 4: Provide Integration Details

Share these with other system developers:

```
OAuth Provider: https://hr.youruniversity.edu

Endpoints:
- Authorization: https://hr.youruniversity.edu/oauth/authorize
- Token: https://hr.youruniversity.edu/oauth/token
- UserInfo: https://hr.youruniversity.edu/oauth/userinfo
- OpenID Config: https://hr.youruniversity.edu/.well-known/openid-configuration
- JWKS: https://hr.youruniversity.edu/.well-known/jwks.json

Client Credentials:
- Client ID: [from Step 3]
- Client Secret: [from Step 3]
- Redirect URI: [must match exactly]

Scopes:
- openid profile email accounting (for accounting system)
- openid profile email payroll (for payroll system)
```

---

## 🔒 Security Best Practices

### 1. HTTPS is Mandatory

OAuth **requires HTTPS** in production. Never use HTTP!

### 2. Strong Client Secrets

- Use long, random secrets (40+ characters)
- Store securely (don't commit to Git)
- Rotate periodically

### 3. Rate Limiting

Already configured on token endpoint. Monitor for abuse.

### 4. Monitor Access

- Log OAuth authorization attempts
- Monitor failed token exchanges
- Alert on suspicious activity

### 5. Regular Updates

- Keep Laravel and Passport updated
- Apply security patches promptly
- Review OAuth logs regularly

---

## 🧪 Testing After Deployment

### 1. Test Discovery Endpoints

```bash
curl https://hr.youruniversity.edu/.well-known/openid-configuration
```

Should return valid JSON with all endpoints.

### 2. Test Authorization Flow

1. Visit: `https://hr.youruniversity.edu/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=openid%20profile%20email&state=test`
2. Login and approve
3. Should redirect with authorization code

### 3. Test Token Exchange

```bash
curl -X POST https://hr.youruniversity.edu/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://accounting.youruniversity.edu/oauth/callback"
```

### 4. Test UserInfo

```bash
curl -X GET https://hr.youruniversity.edu/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📝 Production Checklist

Before going live:

- [ ] Application deployed to production server
- [ ] HTTPS/SSL certificate installed
- [ ] `APP_URL` set to production domain
- [ ] `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Passport keys generated on production server
- [ ] Database migrations run
- [ ] OAuth clients created with production redirect URIs
- [ ] CORS configured for allowed origins
- [ ] Web server configured (Nginx/Apache)
- [ ] All routes accessible
- [ ] Discovery endpoints working
- [ ] Authorization flow tested
- [ ] Token exchange tested
- [ ] UserInfo endpoint tested
- [ ] Error logging configured
- [ ] Monitoring set up

---

## 🆘 Common Production Issues

### Issue: "Invalid redirect URI" after deployment

**Solution:** Update all OAuth clients with production redirect URIs (must use HTTPS)

### Issue: CORS errors

**Solution:** Configure `config/cors.php` with production domains

### Issue: "Client authentication failed"

**Solution:** 
- Verify client ID and secret are correct
- Check that secrets weren't changed
- Ensure client exists in production database

### Issue: Authorization codes expire too quickly

**Solution:** This is normal (10 minutes). Ensure systems exchange codes immediately.

### Issue: HTTPS mixed content warnings

**Solution:** Ensure all URLs use HTTPS, including in JavaScript/config files

---

## 🎯 Quick Deployment Commands

```bash
# On production server
cd /path/to/your/app

# Install dependencies
composer install --optimize-autoloader --no-dev
npm install
npm run build

# Configure
php artisan key:generate
php artisan passport:keys

# Database
php artisan migrate --force

# Optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## 📞 Support for Other Systems

Provide other developers with:

1. **This deployment guide**
2. **OAuth endpoints** (listed above)
3. **Client credentials** (after creating clients)
4. **Example integration code** (from `OAUTH_TESTING_TWO_LARAVEL_SYSTEMS.md`)
5. **Support contact** for issues

---

## ✅ You're Ready!

Once deployed and tested, other systems can:
- Register as OAuth clients
- Authenticate users through your HR system
- Get user information securely
- Implement Single Sign-On (SSO)

Your HR system is now a fully functional Identity Provider! 🎉

