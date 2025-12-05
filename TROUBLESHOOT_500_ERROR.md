# Troubleshooting 500 Server Error

## Quick Fixes

### 1. Check Railway Logs
In Railway Dashboard:
- Go to your service → "Logs"
- Look for error messages
- Common errors will show what's missing

### 2. Common Issues & Fixes

#### Issue: Missing APP_KEY
**Fix:**
```bash
railway run php artisan key:generate
```

#### Issue: Storage Link Missing
**Fix:**
```bash
railway run php artisan storage:link
```

#### Issue: Cache Issues
**Fix:**
```bash
railway run php artisan config:clear
railway run php artisan cache:clear
railway run php artisan route:clear
railway run php artisan view:clear
```

#### Issue: Database Connection
**Check:**
- Database service is running
- Environment variables are set correctly:
  - `DB_CONNECTION`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_DATABASE`
  - `DB_USERNAME`
  - `DB_PASSWORD`

#### Issue: Permissions
**Fix:**
```bash
railway run chmod -R 775 storage bootstrap/cache
```

### 3. Check Environment Variables
Make sure these are set in Railway → Variables:
- `APP_KEY` (should be auto-generated)
- `APP_ENV=production`
- `APP_DEBUG=false` (set to `true` temporarily to see errors)
- `APP_URL` (your Railway URL)

### 4. Enable Debug Mode Temporarily
To see the actual error:
1. In Railway → Variables
2. Set `APP_DEBUG=true`
3. Redeploy
4. Check the error page
5. **Remember to set it back to `false` after fixing!**

### 5. Check Laravel Logs
```bash
railway run tail -f storage/logs/laravel.log
```

