# Stage 1: Build dependencies
FROM php:8.4-cli AS builder

RUN apt-get update -qq && apt-get install -y -qq git unzip libzip-dev 2>&1 | tail -1
RUN docker-php-ext-install pdo pdo_mysql mbstring bcmath xml 2>&1 | tail -1

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /build
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist --no-dev --ignore-platform-reqs 2>&1

# Stage 2: Runtime
FROM php:8.4-cli AS runtime

RUN apt-get update -qq && apt-get install -y -qq git unzip 2>&1 | tail -1
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .
COPY --from=builder /build/vendor ./vendor/
COPY --from=builder /build/composer.lock ./composer.lock

RUN composer dump-autoload --no-interaction 2>&1 || true
RUN php artisan key:generate --force 2>&1 || true
RUN php artisan storage:link 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
