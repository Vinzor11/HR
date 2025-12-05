# Use PHP 8.2 CLI as base image
FROM php:8.2-cli

# Update package list and install dependencies in smaller chunks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install GD library dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    && rm -rf /var/lib/apt/lists/*

# Install other PHP extension dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    libicu-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Configure and install GD extension
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install gd

# Install PHP extensions (install intl separately as it needs ICU)
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath zip opcache

# Install intl extension (requires ICU libraries)
RUN docker-php-ext-configure intl && \
    docker-php-ext-install intl

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /var/www/html

# Copy dependency files
COPY composer.json composer.lock ./
COPY package.json package-lock.json ./

# Install PHP dependencies
RUN composer install --optimize-autoloader --no-dev --no-interaction --no-scripts

# Install Node dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build assets
RUN npm run build

# Set permissions
RUN chmod -R 755 storage bootstrap/cache

# Expose port
EXPOSE 8000

# Start command
CMD php artisan migrate --force && php artisan passport:keys && php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
