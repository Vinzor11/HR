# Fix 419 Error on Production Login

## What is a 419 Error?

A **419 error** in Laravel means **"CSRF Token Mismatch"**. This happens when:
- The CSRF token in the form doesn't match the token in the session
- The session cookie isn't being sent/received properly
- Session data isn't being stored/retrieved correctly

---

## Common Causes in Production

### 1. **Session Cookie Security Settings** ⚠️ MOST COMMON

If your production site uses **HTTPS**, you MUST set:

```env
SESSION_SECURE_COOKIE=true
```

**Why?** Browsers won't send cookies marked as "secure" over HTTP, and won't accept non-secure cookies over HTTPS.

### 2. **Session Domain Mismatch**

If `SESSION_DOMAIN` is set incorrectly, cookies won't be sent:

```env
# ❌ WRONG - Don't include protocol or path
SESSION_DOMAIN=https://yourdomain.com

# ❌ WRONG - Don't include www if your site doesn't use it
SESSION_DOMAIN=www.yourdomain.com

# ✅ CORRECT - Just the domain (or leave empty)
SESSION_DOMAIN=yourdomain.com

# ✅ BEST - Leave empty/null to auto-detect
# (Don't set SESSION_DOMAIN at all)
```

### 3. **Same-Site Cookie Issues**

For production with HTTPS:

```env
# ✅ For same-domain requests (most common)
SESSION_SAME_SITE=lax

# ✅ For cross-domain OAuth/SSO (if needed)
SESSION_SAME_SITE=none
SESSION_SECURE_COOKIE=true  # Required when same_site=none
```

### 4. **Session Driver Issues**

Ensure sessions are being stored properly:

```env
# ✅ Use database for production (more reliable)
SESSION_DRIVER=database

# Make sure sessions table exists
# Run: php artisan session:table
# Run: php artisan migrate
```

### 5. **Session Lifetime Too Short**

If users take too long to fill the form:

```env
SESSION_LIFETIME=120  # 2 hours (default is usually fine)
```

---

## Step-by-Step Fix

### Step 1: Check Your Production `.env` File

Add/update these variables:

```env
# App Configuration
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com  # Must match your actual domain

# Session Configuration (CRITICAL)
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true  # ⚠️ REQUIRED for HTTPS
SESSION_SAME_SITE=lax       # or 'none' if cross-domain needed
# SESSION_DOMAIN=           # Leave empty/null (auto-detect)

# If using cross-domain OAuth/SSO:
# SESSION_SAME_SITE=none
# SESSION_SECURE_COOKIE=true  # Required with same_site=none
```

### Step 2: Verify Sessions Table Exists

Run on your production server:

```bash
php artisan session:table
php artisan migrate
```

This creates the `sessions` table if it doesn't exist.

### Step 3: Clear All Caches

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### Step 4: Verify Cookie Settings

Check your browser's developer tools:
1. Open **Network** tab
2. Try to login
3. Check the **Request Headers** for the login request
4. Look for `Cookie:` header - it should include your session cookie
5. Check **Response Headers** - look for `Set-Cookie:` header

**What to check:**
- ✅ Cookie has `Secure` flag (if using HTTPS)
- ✅ Cookie has correct `Domain` (matches your site)
- ✅ Cookie has `SameSite=Lax` (or None if cross-domain)

### Step 5: Test CSRF Token

In your browser console on the login page:

```javascript
// Check if CSRF token exists
document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

// Check if XSRF-TOKEN cookie exists
document.cookie.match(/XSRF-TOKEN=([^;]+)/)
```

Both should return a token value.

---

## Railway-Specific Fixes

If you're using **Railway**, add these environment variables:

```env
# In Railway Dashboard → Your Service → Variables

APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app.railway.app

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# Don't set SESSION_DOMAIN (leave it empty)
```

**Important:** Railway uses HTTPS by default, so `SESSION_SECURE_COOKIE=true` is **required**.

---

## Additional Debugging Steps

### 1. Check Laravel Logs

```bash
tail -f storage/logs/laravel.log
```

Look for CSRF-related errors when you try to login.

### 2. Check Session Storage

If using database sessions, check if sessions are being created:

```sql
SELECT * FROM sessions ORDER BY last_activity DESC LIMIT 10;
```

### 3. Test with cURL

```bash
# Get CSRF token
curl -c cookies.txt https://your-domain.com/login

# Extract CSRF token from response
CSRF_TOKEN=$(grep -oP 'csrf-token" content="\K[^"]+' cookies.txt)

# Try login with CSRF token
curl -b cookies.txt -X POST https://your-domain.com/login \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -d "email=test@example.com&password=password"
```

### 4. Check Browser Console

Open browser DevTools → Console, and look for:
- Cookie warnings
- CORS errors
- Network errors (419 status)

---

## Quick Fix Checklist

- [ ] `SESSION_SECURE_COOKIE=true` (if using HTTPS)
- [ ] `SESSION_DOMAIN` is empty or matches your domain
- [ ] `SESSION_SAME_SITE=lax` (or `none` with `secure=true`)
- [ ] `SESSION_DRIVER=database` (for production)
- [ ] Sessions table exists (`php artisan migrate`)
- [ ] Cleared all caches (`php artisan config:clear`)
- [ ] `APP_URL` matches your actual domain
- [ ] No trailing slashes in `APP_URL`

---

## Still Not Working?

### Option 1: Temporarily Disable CSRF (NOT RECOMMENDED)

**⚠️ ONLY FOR TESTING - DO NOT USE IN PRODUCTION**

In `bootstrap/app.php`, add login route to CSRF exceptions:

```php
$middleware->validateCsrfTokens(except: [
    'oauth/token',
    'login',  // ⚠️ TEMPORARY - Remove after testing
]);
```

**This is a security risk!** Only use to verify if CSRF is the issue.

### Option 2: Check for Load Balancer/Proxy Issues

If behind a load balancer or reverse proxy:

```env
# Trust proxy
TRUSTED_PROXIES=*

# Or specific IPs
TRUSTED_PROXIES=192.168.1.1,10.0.0.1
```

In `bootstrap/app.php`:

```php
$middleware->trustProxies(at: '*');
```

### Option 3: Verify Inertia CSRF Handling

Inertia should automatically include CSRF tokens. Verify in `resources/js/app.tsx` that the CSRF token is being shared correctly.

---

## Most Likely Solution

**For Railway/Heroku/Platforms with Load Balancers:**

1. **Trust proxies** (REQUIRED):
   ```php
   // In bootstrap/app.php
   $middleware->trustProxies(at: '*');
   ```

2. **Set secure cookies**:
   ```env
   SESSION_SECURE_COOKIE=true
   ```

**For other platforms:**

**99% of the time**, the fix is:

```env
SESSION_SECURE_COOKIE=true
```

If your production site uses HTTPS (which it should), this is **required**.

---

## Need More Help?

1. Check browser console for specific errors
2. Check Laravel logs: `storage/logs/laravel.log`
3. Verify session cookies in browser DevTools → Application → Cookies
4. Test with a different browser (to rule out browser-specific issues)
5. Check if the issue happens on first load or after some time (session expiration)

