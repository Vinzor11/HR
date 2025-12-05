#!/bin/bash
# Quick fix script for 500 errors

echo "🔧 Fixing common 500 error issues..."

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Generate APP_KEY if missing
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate
fi

# Create storage link
php artisan storage:link

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Done! Try accessing your app now."

