FROM php:8.4-cli-alpine

# Base deps + PHP extensions Laravel needs
RUN apk add --no-cache bash libzip-dev oniguruma-dev && \
    docker-php-ext-install pdo pdo_mysql mbstring bcmath xml zip gd

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Install deps
RUN composer install --no-interaction --prefer-dist --no-dev 2>&1 || \
    composer update --no-interaction 2>&1 || true

# Laravel setup
RUN php artisan key:generate --force 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
