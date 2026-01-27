#!/bin/bash

# Clear caches (fail gracefully if database not available)
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

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

# Run migrations and seeders
php artisan migrate --force
php artisan db:seed --force || true

# Generate passport keys (fail gracefully if already exists)
php artisan passport:keys || true

# Create storage link if it doesn't exist
php artisan storage:link || true

# Start the server
php artisan serve --host=0.0.0.0 --port=$PORT

