# Debug 500 Error on Railway

## Step 1: Enable Debug Mode (Temporarily)

**In Railway Dashboard:**
1. Go to your service → **Variables**
2. Find `APP_DEBUG`
3. Change it from `false` to `true`
4. **Save** (Railway will auto-redeploy)
5. Try accessing your site again
6. **You should now see the actual error message instead of a generic 500 page**

## Step 2: Check Railway Logs

**In Railway Dashboard:**
1. Go to your service → **Logs**
2. Look for PHP errors, fatal errors, or exceptions
3. The error message will tell you exactly what's wrong

## Step 3: Common Issues

### Issue: Missing View File
**Error:** `View [welcome] not found`
**Fix:** The welcome page might not exist. Check if `resources/js/pages/welcome.tsx` exists.

### Issue: Inertia Not Configured
**Error:** Inertia-related errors
**Fix:** Make sure Inertia is properly installed and configured.

### Issue: Database Connection
**Error:** Database connection errors
**Fix:** Check your database environment variables in Railway.

### Issue: Missing Dependencies
**Error:** Class not found, method doesn't exist
**Fix:** Run `composer install` on Railway.

## Step 4: Test Basic Route

Try accessing: `https://hr-production-eaf1.up.railway.app/test`

This route doesn't use Inertia and should work if Laravel is functioning.

## Step 5: After Finding the Error

1. **Fix the error** based on what you see
2. **Set `APP_DEBUG=false`** again (for security)
3. **Redeploy**

---

## Quick Commands to Run in Railway

Go to Railway → Your Service → **Deployments** → **Run Command**

```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Check if welcome page exists
ls -la resources/js/pages/welcome.tsx

# Check Laravel logs
tail -n 50 storage/logs/laravel.log
```

---

## Most Likely Causes

1. **Missing welcome.tsx file** - The route tries to render 'welcome' but the file doesn't exist
2. **Inertia configuration issue** - Inertia might not be properly set up
3. **Database connection** - Database might not be accessible
4. **Missing environment variable** - Some required env var is missing

**Enable `APP_DEBUG=true` first to see the actual error!**

