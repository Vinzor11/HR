# Production Debugging Setup - Quick Start

This document summarizes what has been set up to help you debug errors in production.

## ✅ What's Been Configured

### 1. Enhanced Exception Logging
- **File:** `bootstrap/app.php`
- **What it does:** Automatically logs all unhandled exceptions with detailed context (URL, user, IP, trace, etc.)
- **Result:** All errors are now logged with more information for easier debugging

### 2. Secure Web-Based Log Viewer
- **Controller:** `app/Http/Controllers/LogViewController.php`
- **Routes:** Added to `routes/web.php`
- **Access:** Only Super Admins can access
- **Features:**
  - View recent log entries via web interface
  - Download log files
  - Clear logs (with automatic backup)
  - View error statistics

### 3. Comprehensive Debugging Guide
- **File:** `PRODUCTION_DEBUGGING_GUIDE.md`
- **Content:** Complete guide on how to debug production errors

## 🚀 How to Use

### Quick Access to Logs

#### Option 1: Railway Dashboard (Recommended)
1. Go to your Railway project
2. Click on your service
3. Open the **"Logs"** tab
4. View real-time logs

#### Option 2: Web-Based Log Viewer
1. Log in as Super Admin
2. Navigate to: `https://your-domain.com/admin/logs`
3. View, download, or clear logs

#### Option 3: Command Line (If you have SSH access)
```bash
# View last 100 lines
tail -n 100 storage/logs/laravel.log

# Follow logs in real-time
tail -f storage/logs/laravel.log

# Search for errors
grep -i "error" storage/logs/laravel.log
```

### Configure Detailed Logging

In your production `.env` file:

```env
APP_ENV=production
APP_DEBUG=false  # Keep this FALSE for security

# Enable detailed logging
LOG_CHANNEL=daily  # Automatically rotates logs
LOG_LEVEL=debug    # Log everything (debug, info, warning, error, critical)
```

Then clear config cache:
```bash
php artisan config:clear
```

## 📋 Available Log Viewer Routes

| Route | Method | Description | Access |
|-------|--------|-------------|--------|
| `/admin/logs` | GET | View logs (JSON) | Super Admin only |
| `/admin/logs?lines=1000` | GET | View last N lines | Super Admin only |
| `/admin/logs/download` | GET | Download log file | Super Admin only |
| `/admin/logs/clear` | POST | Clear logs (creates backup) | Super Admin only |

## 🔍 Example: Viewing Logs via API

```bash
# Using curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/admin/logs?lines=500

# Or visit in browser (if logged in as Super Admin)
https://your-domain.com/admin/logs?lines=500
```

## ⚠️ Important Security Notes

1. **Never set `APP_DEBUG=true` in production permanently**
   - Only enable temporarily to see errors
   - Always disable after debugging

2. **Log Viewer is Protected**
   - Only Super Admins can access
   - Ensure your Super Admin account is secure

3. **Log Files Contain Sensitive Data**
   - Don't share log files publicly
   - Be careful when downloading logs

## 📖 Full Documentation

For complete instructions, see: **PRODUCTION_DEBUGGING_GUIDE.md**

## 🆘 Quick Troubleshooting

### Can't see errors?
1. Check `storage/logs/laravel.log` exists
2. Check file permissions: `chmod -R 775 storage/logs`
3. Check `.env` has `LOG_CHANNEL` and `LOG_LEVEL` set

### Log viewer not accessible?
1. Ensure you're logged in as Super Admin
2. Check the route is registered: `php artisan route:list | grep logs`
3. Clear route cache: `php artisan route:clear`

### Want to see errors in browser temporarily?
1. Set `APP_DEBUG=true` in `.env`
2. Clear cache: `php artisan config:clear`
3. View the error
4. **IMMEDIATELY** set `APP_DEBUG=false` again
5. Clear cache again

## 📞 Next Steps

1. ✅ Read `PRODUCTION_DEBUGGING_GUIDE.md` for detailed instructions
2. ✅ Configure logging in your production `.env` file
3. ✅ Test the log viewer by accessing `/admin/logs` (as Super Admin)
4. ✅ Set up regular log monitoring routine

---

**Remember:** Errors in production are logged automatically. You just need to know where to look!

