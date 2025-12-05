# Railway Deployment Fix - PHP GD Extension

## Problem
Railway deployment fails because PHP GD extension is missing, which is required by:
- `phpoffice/phpspreadsheet`
- `phpoffice/phpword`
- `maatwebsite/excel`

## Solution

I've created configuration files to fix this issue:

### Files Created:
1. **`Dockerfile`** - Custom Docker image with PHP GD extension
2. **`nixpacks.toml`** - Alternative configuration for Railway's nixpacks builder
3. **`railway.json`** - Railway-specific configuration
4. **`.railwayignore`** - Files to exclude from deployment

## How to Fix in Railway

### Option 1: Use Dockerfile (Recommended)

1. **In Railway Dashboard:**
   - Go to your project settings
   - Under "Build" section, select **"Dockerfile"** as the builder
   - Railway will automatically detect the `Dockerfile` in your repo

2. **Redeploy:**
   - Push these new files to GitHub
   - Railway will automatically rebuild with the Dockerfile
   - The Dockerfile includes PHP GD extension and all required dependencies

### Option 2: Use Nixpacks with Custom Config

1. **In Railway Dashboard:**
   - Go to your project settings
   - Under "Build" section, keep **"Nixpacks"** as builder
   - Railway will use `nixpacks.toml` automatically

2. **Redeploy:**
   - Push the `nixpacks.toml` file
   - Railway will use the custom configuration

### Option 3: Manual Build Settings (If above don't work)

1. **In Railway Dashboard:**
   - Go to your service
   - Click "Settings" → "Build"
   - Set **Build Command:**
     ```bash
     apt-get update && apt-get install -y libpng-dev libfreetype6-dev libjpeg62-turbo-dev && docker-php-ext-configure gd --with-freetype --with-jpeg && docker-php-ext-install gd && composer install --optimize-autoloader --no-dev --no-interaction && npm ci --omit=dev && npm run build
     ```

2. **Set Start Command:**
   ```bash
   php artisan migrate --force && php artisan passport:keys && php artisan serve --host=0.0.0.0 --port=$PORT
   ```

## Steps to Deploy

1. **Commit and push the new files:**
   ```bash
   git add Dockerfile nixpacks.toml railway.json .railwayignore
   git commit -m "Add Railway deployment configuration with PHP GD extension"
   git push origin main
   ```

2. **In Railway:**
   - Go to your project
   - Click "Deploy" or wait for automatic deployment
   - Railway will rebuild with the new configuration

3. **Verify the build:**
   - Check the build logs in Railway
   - You should see PHP GD extension being installed
   - Build should complete successfully

## Environment Variables Needed

Make sure these are set in Railway:

```env
APP_NAME=ESSU HRMS
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app.railway.app

DB_CONNECTION=mysql
DB_HOST=your-db-host.railway.app
DB_PORT=3306
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=your-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

## After Successful Deployment

1. **Run migrations:**
   - Railway will run migrations automatically (included in start command)
   - Or run manually via Railway CLI: `railway run php artisan migrate --force`

2. **Generate Passport keys:**
   - Also included in start command
   - Or run: `railway run php artisan passport:keys`

3. **Test your application:**
   - Visit your Railway URL
   - Test login
   - Create OAuth clients

## Troubleshooting

### If build still fails:

1. **Check build logs:**
   - Look for PHP extension errors
   - Verify Dockerfile is being used

2. **Try clearing Railway cache:**
   - In Railway dashboard: Settings → Clear Build Cache

3. **Verify files are committed:**
   ```bash
   git status
   git log --oneline -5
   ```

### If GD extension still missing:

Add this to your Dockerfile before installing extensions:
```dockerfile
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd
```

## Success Indicators

✅ Build completes without errors
✅ No "ext-gd missing" errors
✅ Application starts successfully
✅ You can access your app at Railway URL

---

**The Dockerfile approach is recommended as it gives you full control over the PHP environment and extensions.**

