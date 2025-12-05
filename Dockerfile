# Use official PHP 8.2 image
FROM php:8.2-cli

# Set working directory
WORKDIR /var/www/html

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    --no-install-recommends \
    git \
    curl \
    libpng-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    ca-certificates && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY composer.json composer.lock ./
COPY package.json package-lock.json ./

# Install dependencies
RUN composer install --optimize-autoloader --no-dev --no-interaction --no-scripts && \
    npm ci --omit=dev

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
