#!/bin/bash

# HR System Deployment Script
# This script helps deploy your Laravel HR system to a server

echo "🚀 HR System Deployment Script"
echo "================================"
echo ""

# Check if running on server
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env file with your production settings"
    echo ""
fi

# Install PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --optimize-autoloader --no-dev

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Build assets
echo "🏗️  Building frontend assets..."
npm run build

# Generate application key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    echo "🔑 Generating application key..."
    php artisan key:generate
fi

# Run migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Generate Passport keys (IMPORTANT for OAuth!)
echo "🔐 Generating Passport OAuth keys..."
php artisan passport:keys

# Create storage link
echo "📁 Creating storage symlink..."
php artisan storage:link

# Optimize Laravel
echo "⚡ Optimizing Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify .env file has correct production settings"
echo "   2. Test your application: https://your-domain.com"
echo "   3. Create OAuth clients at: /oauth/clients"
echo "   4. Test OAuth flow"
echo ""

