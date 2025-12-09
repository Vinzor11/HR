# Quick Fix: 419 Error on Production Login

## 🎯 The Most Common Fix (90% of cases)

Add this to your production `.env` file or Railway environment variables:

```env
SESSION_SECURE_COOKIE=true
```

**That's it!** If your production site uses HTTPS (which it should), this is required.

---

## Why This Happens

A **419 error** = **CSRF Token Mismatch**

When your site uses HTTPS but session cookies aren't marked as "secure", browsers reject them, causing:
- Session cookies not being sent
- CSRF tokens not matching
- Login failing with 419 error

---

## Complete Production Session Config

For Railway or any production server with HTTPS:

```env
# App
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Session (CRITICAL for HTTPS)
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true    # ⚠️ REQUIRED for HTTPS
SESSION_SAME_SITE=lax

# Don't set SESSION_DOMAIN (leave empty)
```

---

## After Adding the Variable

1. **Clear config cache:**
   ```bash
   php artisan config:clear
   ```

2. **Restart your application** (if using Railway, it auto-restarts)

3. **Try logging in again**

---

## Still Not Working?

1. **Check browser DevTools → Application → Cookies**
   - Look for your session cookie
   - Verify it has the `Secure` flag
   - Check the `Domain` matches your site

2. **Verify sessions table exists:**
   ```bash
   php artisan migrate
   ```

3. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

4. **See full troubleshooting guide:** `FIX_419_ERROR_PRODUCTION.md`

