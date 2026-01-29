#!/bin/bash

# Clear all caches so config/routes/views pick up Railway env and latest code
php artisan optimize:clear || true
# Re-cache for production (uses current env from Railway Variables)
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Setup persistent storage if STORAGE_PATH is set (Railway volume)
if [ -n "$STORAGE_PATH" ]; then
    echo "Setting up persistent storage at $STORAGE_PATH"
    
    # Create directory structure in volume if it doesn't exist
    mkdir -p "$STORAGE_PATH/app/public"
    mkdir -p "$STORAGE_PATH/app/private"
    
    # Set proper permissions (775 allows read/write for web server)
    chmod -R 775 "$STORAGE_PATH/app/public" 2>/dev/null || true
    chmod -R 775 "$STORAGE_PATH/app/private" 2>/dev/null || true
    
    # Create symlinks from default storage paths to volume (if they don't exist)
    # This allows Laravel to use the volume transparently
    if [ ! -L "storage/app/public" ] && [ ! -d "storage/app/public" ]; then
        # If storage/app/public doesn't exist, create symlink to volume
        mkdir -p storage/app
        ln -s "$STORAGE_PATH/app/public" "storage/app/public" 2>/dev/null || true
    elif [ -d "storage/app/public" ] && [ ! -L "storage/app/public" ]; then
        # If it exists as a directory, move contents to volume and replace with symlink
        if [ -z "$(ls -A $STORAGE_PATH/app/public 2>/dev/null)" ]; then
            echo "Migrating existing files to persistent storage..."
            cp -r storage/app/public/* "$STORAGE_PATH/app/public/" 2>/dev/null || true
        fi
        rm -rf storage/app/public
        ln -s "$STORAGE_PATH/app/public" "storage/app/public" 2>/dev/null || true
    fi
    
    # Same for private storage
    if [ ! -L "storage/app/private" ] && [ ! -d "storage/app/private" ]; then
        mkdir -p storage/app
        ln -s "$STORAGE_PATH/app/private" "storage/app/private" 2>/dev/null || true
    elif [ -d "storage/app/private" ] && [ ! -L "storage/app/private" ]; then
        if [ -z "$(ls -A $STORAGE_PATH/app/private 2>/dev/null)" ]; then
            cp -r storage/app/private/* "$STORAGE_PATH/app/private/" 2>/dev/null || true
        fi
        rm -rf storage/app/private
        ln -s "$STORAGE_PATH/app/private" "storage/app/private" 2>/dev/null || true
    fi
fi

# Run migrations on every deploy/rebuild (--force for non-interactive)
echo "Running database migrations..."
php artisan migrate --force

# Run seeders (e.g. LegacyCleanupSeeder via DatabaseSeeder; skip if none)
echo "Running database seeders..."
php artisan db:seed --force || true

# Generate passport keys (fail gracefully if already exists)
php artisan passport:keys || true

# Create storage link if it doesn't exist
php artisan storage:link || true

# Restart queue workers so they run new code (no-op if no workers)
php artisan queue:restart || true

# Start the Laravel scheduler in the background
# This runs scheduled tasks like logging expired sessions
echo "Starting Laravel scheduler in background..."
php artisan schedule:work >> /dev/null 2>&1 &

# Start the server
php artisan serve --host=0.0.0.0 --port=$PORT

