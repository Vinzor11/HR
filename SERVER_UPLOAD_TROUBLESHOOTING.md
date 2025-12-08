# CS Form 212 Upload - Server Troubleshooting Guide

## Common Server Issues

### 1. Check Server Logs

First, check the Laravel logs on your server to see the exact error:

```bash
# SSH into your server
tail -f storage/logs/laravel.log
```

Then try uploading a file and watch for errors.

### 2. File Permissions

The most common issue is file permissions. The `storage/app/temp` directory must be writable:

```bash
# On your server, run:
cd /path/to/your/project

# Create temp directory if it doesn't exist
mkdir -p storage/app/temp/cs_form_212

# Set proper permissions
chmod -R 775 storage/app/temp
chmod -R 775 storage/app
chmod -R 775 storage

# Set ownership (adjust user/group as needed)
chown -R www-data:www-data storage/app/temp
# OR if using different user:
chown -R your-user:www-data storage/app/temp
```

### 3. PHP Upload Limits

Check and increase PHP upload limits on your server:

**Check current limits:**
```bash
php -i | grep -E "upload_max_filesize|post_max_size|max_file_uploads"
```

**Edit php.ini:**
```bash
# Find your php.ini file
php --ini

# Edit the file (usually /etc/php/8.2/fpm/php.ini or /etc/php/8.2/cli/php.ini)
sudo nano /etc/php/8.2/fpm/php.ini
```

**Set these values:**
```ini
upload_max_filesize = 20M
post_max_size = 25M
max_file_uploads = 20
max_execution_time = 300
memory_limit = 256M
```

**Restart PHP-FPM:**
```bash
sudo systemctl restart php8.2-fpm
# OR
sudo service php8.2-fpm restart
```

### 4. Check Directory Exists

The code creates the directory automatically, but verify it exists:

```bash
ls -la storage/app/temp/cs_form_212
```

If it doesn't exist, create it:
```bash
mkdir -p storage/app/temp/cs_form_212
chmod 775 storage/app/temp/cs_form_212
```

### 5. Check Disk Space

Make sure your server has enough disk space:

```bash
df -h
```

### 6. Check PHP Error Logs

Check PHP error logs for upload-related errors:

```bash
# For PHP-FPM
tail -f /var/log/php8.2-fpm.log

# Or general PHP errors
tail -f /var/log/php_errors.log
```

### 7. Test File Upload Manually

Create a test script to verify uploads work:

```bash
# Create test file
cat > public/test-upload.php << 'EOF'
<?php
phpinfo();
echo "<br><br>";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "<br>";
echo "post_max_size: " . ini_get('post_max_size') . "<br>";
echo "max_file_uploads: " . ini_get('max_file_uploads') . "<br>";
echo "upload_tmp_dir: " . ini_get('upload_tmp_dir') . "<br>";
echo "tmp_dir writable: " . (is_writable(sys_get_temp_dir()) ? 'YES' : 'NO') . "<br>";
echo "storage/app/temp writable: " . (is_writable(storage_path('app/temp')) ? 'YES' : 'NO') . "<br>";
?>
EOF

# Test in browser: https://your-domain.com/test-upload.php
# Then DELETE this file for security!
```

### 8. Check Nginx/Apache Configuration

**For Nginx**, make sure `client_max_body_size` is set:

```nginx
# In your Nginx config file
client_max_body_size 25M;
```

**For Apache**, check `.htaccess` or `httpd.conf`:

```apache
# In .htaccess or httpd.conf
php_value upload_max_filesize 20M
php_value post_max_size 25M
```

### 9. Check CSRF Token

If you're getting 419 errors on the server:

- Make sure `APP_URL` in `.env` matches your actual domain
- Clear config cache: `php artisan config:clear`
- Check if sessions are working properly

### 10. Check Browser Console

On the server, open browser DevTools (F12) and check:
- Network tab: What's the actual error response?
- Console tab: Any JavaScript errors?
- Check the request headers and response

## Quick Diagnostic Commands

Run these on your server to diagnose:

```bash
# Check PHP upload settings
php -r "echo 'upload_max_filesize: ' . ini_get('upload_max_filesize') . PHP_EOL;"
php -r "echo 'post_max_size: ' . ini_get('post_max_size') . PHP_EOL;"

# Check storage permissions
ls -la storage/app/
ls -la storage/app/temp/

# Check if directory is writable
php -r "echo 'storage/app/temp writable: ' . (is_writable(storage_path('app/temp')) ? 'YES' : 'NO') . PHP_EOL;"

# Check disk space
df -h .

# Check Laravel logs for upload errors
tail -50 storage/logs/laravel.log | grep -i "cs form\|upload\|file"
```

## Most Likely Issues

1. **Permissions** - `storage/app/temp` not writable (90% of cases)
2. **PHP limits** - `upload_max_filesize` or `post_max_size` too small
3. **Directory missing** - `storage/app/temp/cs_form_212` doesn't exist
4. **Nginx/Apache limits** - `client_max_body_size` too small

## Solution Checklist

- [ ] Check server logs: `tail -f storage/logs/laravel.log`
- [ ] Verify permissions: `chmod -R 775 storage/app/temp`
- [ ] Check PHP limits: `php -i | grep upload_max_filesize`
- [ ] Increase PHP limits in php.ini
- [ ] Restart PHP-FPM: `sudo systemctl restart php8.2-fpm`
- [ ] Check Nginx config: `client_max_body_size 25M;`
- [ ] Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`
- [ ] Verify directory exists: `ls -la storage/app/temp/cs_form_212`
- [ ] Test with browser DevTools to see exact error




