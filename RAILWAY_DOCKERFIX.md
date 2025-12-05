# Railway Docker Build Fix

## Problem
Docker build fails when installing system packages with `apt-get install`.

## Solutions

### Solution 1: Use the Updated Dockerfile (Recommended)

The main `Dockerfile` has been updated with better error handling. Try deploying again.

### Solution 2: Use Nixpacks Instead (Easier)

If Dockerfile continues to fail, switch to Nixpacks:

1. **In Railway Dashboard:**
   - Go to your project → Settings
   - Under "Build", change from "Dockerfile" to **"Nixpacks"**
   - Railway will use `nixpacks.toml` automatically

2. **The `nixpacks.toml` file already includes PHP GD extension:**
   ```toml
   nixPkgs = [
     "php82",
     "php82Extensions.gd",
     ...
   ]
   ```

### Solution 3: Use Simple Dockerfile

If you want to stick with Dockerfile, try the simpler version:

1. **Rename files:**
   ```bash
   mv Dockerfile Dockerfile.original
   mv Dockerfile.simple Dockerfile
   ```

2. **Commit and push:**
   ```bash
   git add Dockerfile
   git commit -m "Use simpler Dockerfile"
   git push
   ```

### Solution 4: Manual Build Command in Railway

If all else fails, use Railway's build settings:

1. **In Railway Dashboard:**
   - Go to your service → Settings → Build
   - **Disable Dockerfile** (uncheck "Use Dockerfile")
   - Set **Build Command:**
     ```bash
     apt-get update && apt-get install -y libpng-dev libfreetype6-dev libjpeg62-turbo-dev && docker-php-ext-configure gd --with-freetype --with-jpeg && docker-php-ext-install gd && composer install --optimize-autoloader --no-dev --no-interaction && npm ci --omit=dev && npm run build
     ```
   - Set **Start Command:**
     ```bash
     php artisan migrate --force && php artisan passport:keys && php artisan serve --host=0.0.0.0 --port=$PORT
     ```

## Recommended: Switch to Nixpacks

Nixpacks is Railway's native builder and handles PHP extensions better:

1. In Railway: Settings → Build → Select **"Nixpacks"**
2. The `nixpacks.toml` file will be used automatically
3. Redeploy

This is usually the most reliable option for Laravel apps on Railway.

