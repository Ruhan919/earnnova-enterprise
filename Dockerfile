FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    && docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    zip \
    bcmath \
    gd \
    mbstring \
    pcntl \
    && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community \
    gnu-libiconv \
    && docker-php-ext-install sockets

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Swoole for Octane
RUN pecl install swoole && docker-php-ext-enable swoole

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --optimize-autoloader --no-dev && \
    chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "octane:start", "--server=swoole", "--host=0.0.0.0", "--port=8000"]
