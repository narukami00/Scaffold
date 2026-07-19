FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev \
    libzip-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure and install GD and other PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-configure pcntl --enable-pcntl \
    && docker-php-ext-install pdo pdo_pgsql pgsql gd zip bcmath opcache pcntl

# Enable Apache modules and copy virtual host configuration
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN a2enmod rewrite proxy proxy_http proxy_wstunnel
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy project files (including the pre-built public/build folder)
COPY . .

# Install dependencies (ignoring scripts initially to avoid bootstrap issue during build)
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port
EXPOSE 80

# Run migrations, ensure public storage symlink, start Reverb + Apache
CMD php artisan migrate --force \
    && (php artisan storage:link || true) \
    && php artisan reverb:start --host=127.0.0.1 --port=8080 & apache2-foreground
