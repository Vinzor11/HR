#!/bin/bash
set -e

# Clear caches (fail gracefully if database not available)
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Run migrations and seeders
php artisan migrate --force
php artisan db:seed --force

# Generate passport keys (fail gracefully if already exists)
php artisan passport:keys || true

# Start the server
php artisan serve --host=0.0.0.0 --port=$PORT

