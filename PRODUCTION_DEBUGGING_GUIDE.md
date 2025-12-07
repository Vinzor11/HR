# Production Error Debugging Guide

When your Laravel application is running in production, errors are hidden from users for security reasons. This guide shows you how to debug errors without exposing them to end users.

## Table of Contents
1. [Understanding Production Error Behavior](#understanding-production-error-behavior)
2. [Accessing Log Files](#accessing-log-files)
3. [Real-time Log Monitoring](#real-time-log-monitoring)
4. [Enable Detailed Logging in Production](#enable-detailed-logging-in-production)
5. [Temporary Debug Mode](#temporary-debug-mode)
6. [Browser Console Errors (Frontend)](#browser-console-errors-frontend)
7. [Advanced Debugging Techniques](#advanced-debugging-techniques)
8. [Best Practices](#best-practices)

---

## Understanding Production Error Behavior

In production:
- ✅ **Errors are logged** to `storage/logs/laravel.log`
- ❌ **Errors are NOT displayed** in the browser (users see generic error pages)
- ❌ **Browser console** won't show backend errors automatically

**Why?** Security - exposing error details can reveal sensitive information about your system.

---

## Accessing Log Files

### Method 1: Railway Dashboard (If deployed on Railway)

1. Go to your Railway project dashboard
2. Click on your service
3. Navigate to the **"Logs"** tab
4. View real-time application logs

### Method 2: Via SSH/Command Line

If you have SSH access to your server:

```bash
# View the last 100 lines of the log
tail -n 100 storage/logs/laravel.log

# Follow logs in real-time (like watching a live stream)
tail -f storage/logs/laravel.log

# Search for specific errors
grep -i "error" storage/logs/laravel.log

# Search for errors in the last hour
grep -i "error" storage/logs/laravel.log | tail -50

# View errors from a specific date
grep "2024-01-15" storage/logs/laravel.log | grep -i "error"
```

### Method 3: Download Log File

If you can access the server via FTP/SFTP or file manager:
- Navigate to `storage/logs/laravel.log`
- Download the file
- Open in a text editor to search for errors

### Method 4: Railway CLI

```bash
# View logs via Railway CLI
railway logs

# Follow logs in real-time
railway logs --follow

# View logs from a specific service
railway logs --service your-service-name
```

### Method 5: Web-Based Log Viewer (Built-in)

Your application includes a secure web-based log viewer that only Super Admins can access:

1. **Access the log viewer:**
   - Navigate to: `https://your-domain.com/admin/logs`
   - Or use the route: `route('admin.logs.view')`
   - You must be logged in as a Super Admin

2. **View logs via API:**
   ```bash
   # Get last 500 lines (default)
   GET /admin/logs
   
   # Get last 1000 lines
   GET /admin/logs?lines=1000
   
   # Download log file
   GET /admin/logs/download
   ```

3. **Features:**
   - View recent log entries (configurable number of lines)
   - See error statistics (error count, warnings, etc.)
   - Download log files
   - Clear logs (with automatic backup)

**Security:** Only users with the "Super Admin" role can access these routes.

---

## Real-time Log Monitoring

### Option 1: Tail Command (SSH/CLI)

```bash
# Watch logs in real-time
tail -f storage/logs/laravel.log

# Watch with line numbers and highlight errors
tail -f storage/logs/laravel.log | grep --color -E "ERROR|CRITICAL|WARNING|$"
```

### Option 2: Railway Logs

In Railway dashboard, logs update in real-time automatically.

### Option 3: Create a Log Monitoring Script

Create a helper script to monitor logs more effectively:

```bash
# Save this as monitor-logs.sh
#!/bin/bash
tail -f storage/logs/laravel.log | while read line; do
  if echo "$line" | grep -q "ERROR\|CRITICAL"; then
    echo -e "\033[0;31m$line\033[0m"  # Red for errors
  elif echo "$line" | grep -q "WARNING"; then
    echo -e "\033[0;33m$line\033[0m"  # Yellow for warnings
  else
    echo "$line"
  fi
done
```

---

## Enable Detailed Logging in Production

You can log detailed errors without showing them to users by configuring your environment variables:

### Step 1: Configure Log Level

In your `.env` file (on your production server):

```env
# Keep these settings for production
APP_ENV=production
APP_DEBUG=false  # Keep this FALSE for security

# Enable detailed logging
LOG_CHANNEL=daily  # Use 'daily' for automatic log rotation
LOG_LEVEL=debug    # Log everything (debug, info, warning, error, critical)

# Or use stack for multiple channels
LOG_STACK=daily,errorlog
```

### Step 2: Ensure Log Directory is Writable

```bash
# Set proper permissions
chmod -R 775 storage/logs
chown -R www-data:www-data storage/logs  # Adjust user/group as needed
```

### Step 3: Clear Configuration Cache

After changing `.env`:

```bash
php artisan config:clear
php artisan cache:clear
```

---

## Temporary Debug Mode

**⚠️ WARNING: Only use this temporarily! Never leave debug mode enabled in production.**

### Enable Debug Mode Temporarily

1. **Via Railway Dashboard:**
   - Go to Variables
   - Set `APP_DEBUG=true`
   - Redeploy your service

2. **Via Environment File:**
   ```env
   APP_DEBUG=true
   ```
   Then clear cache:
   ```bash
   php artisan config:clear
   ```

3. **View the error** in your browser

4. **IMMEDIATELY disable debug mode:**
   ```env
   APP_DEBUG=false
   ```
   Clear cache again and redeploy.

---

## Browser Console Errors (Frontend)

For JavaScript/React errors in the browser console:

### Check Browser Developer Tools

1. Open your application in a browser
2. Press `F12` or `Right-click → Inspect`
3. Go to the **Console** tab
4. Look for red error messages

### Enable Detailed Frontend Logging

In your React/Inertia application, you can add logging:

```javascript
// In your React components or Axios interceptors
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    console.error('Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return Promise.reject(error);
  }
);
```

---

## Advanced Debugging Techniques

### 1. Log Specific Errors with Context

Add detailed logging in your code:

```php
use Illuminate\Support\Facades\Log;

try {
    // Your code here
} catch (\Exception $e) {
    Log::error('Error processing user request', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'user_id' => auth()->id(),
        'request_url' => request()->fullUrl(),
        'request_data' => request()->all(),
    ]);
    
    // Return user-friendly error (don't expose details)
    return response()->json(['error' => 'An error occurred'], 500);
}
```

### 2. Create a Debug Endpoint (For Authorized Users Only)

Create a secure route to view recent logs:

```php
// In routes/web.php (protected route)
Route::get('/admin/debug/logs', function () {
    // Only allow admin users
    abort_unless(auth()->user()->hasRole('admin'), 403);
    
    $logFile = storage_path('logs/laravel.log');
    
    if (!file_exists($logFile)) {
        return response()->json(['error' => 'Log file not found'], 404);
    }
    
    // Get last 500 lines
    $lines = file($logFile);
    $recentLines = array_slice($lines, -500);
    
    return response()->json([
        'logs' => $recentLines,
        'total_lines' => count($lines),
    ]);
})->middleware(['auth', 'verified'])->name('admin.debug.logs');
```

### 3. Use Error Tracking Services (Recommended)

Integrate services like:
- **Sentry** (https://sentry.io)
- **Bugsnag** (https://www.bugsnag.com)
- **Rollbar** (https://rollbar.com)

These services automatically capture errors and send notifications.

#### Example: Setting up Sentry

1. Install Sentry:
   ```bash
   composer require sentry/sentry-laravel
   ```

2. Configure in `.env`:
   ```env
   SENTRY_LARAVEL_DSN=your-sentry-dsn-here
   ```

3. Errors will automatically be sent to Sentry dashboard!

---

## Best Practices

### ✅ DO:
- ✅ Check logs regularly
- ✅ Use log levels appropriately (debug, info, warning, error, critical)
- ✅ Include context in error logs (user ID, request data, etc.)
- ✅ Set up log rotation to prevent disk space issues
- ✅ Use error tracking services for critical applications
- ✅ Monitor logs in real-time during deployments

### ❌ DON'T:
- ❌ Never set `APP_DEBUG=true` in production permanently
- ❌ Don't expose raw error messages to users
- ❌ Don't log sensitive information (passwords, credit cards, etc.)
- ❌ Don't forget to rotate logs (Laravel's 'daily' channel does this automatically)
- ❌ Don't ignore warning logs - they often indicate future problems

### Logging Checklist

- [ ] Logs are being written to `storage/logs/laravel.log`
- [ ] Log directory has proper permissions (775)
- [ ] Log rotation is configured (use 'daily' channel)
- [ ] Error tracking service is configured (optional but recommended)
- [ ] You have a way to access logs (SSH, Railway dashboard, etc.)
- [ ] Logs are being monitored regularly

---

## Quick Reference Commands

```bash
# View last 50 lines
tail -n 50 storage/logs/laravel.log

# Follow logs in real-time
tail -f storage/logs/laravel.log

# Search for errors
grep -i error storage/logs/laravel.log

# Clear log file (BE CAREFUL!)
> storage/logs/laravel.log

# Check log file size
ls -lh storage/logs/laravel.log

# Count error occurrences
grep -c "ERROR" storage/logs/laravel.log

# View errors from today
grep "$(date +%Y-%m-%d)" storage/logs/laravel.log | grep -i error

# Clear Laravel cache
php artisan config:clear
php artisan cache:clear
```

---

## Common Error Patterns

### Database Connection Errors
```
SQLSTATE[HY000] [2002] Connection refused
```
**Solution:** Check database credentials and connection settings

### Permission Errors
```
The stream or file "storage/logs/laravel.log" could not be opened
```
**Solution:** Set proper permissions: `chmod -R 775 storage`

### Missing File Errors
```
File does not exist at path
```
**Solution:** Check file paths, verify files are uploaded/deployed correctly

### Memory Errors
```
Allowed memory size exhausted
```
**Solution:** Increase PHP memory limit in php.ini or .env

---

## Need More Help?

1. Check the existing `TROUBLESHOOT_500_ERROR.md` file
2. Review Laravel's official logging documentation
3. Check your server's error logs (usually in `/var/log/`)
4. Contact your hosting provider's support

---

**Remember:** Errors in production are normal. The key is having a good system to detect, log, and fix them quickly!

