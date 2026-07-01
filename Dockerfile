# Stage 1: Resolve deps using composer image with platform reqs ignored
FROM composer:latest AS staging
WORKDIR /app
COPY composer.json ./
RUN composer update --no-interaction --prefer-dist --no-dev --ignore-platform-reqs 2>&1

# Stage 2: Run the app
FROM php:8.4-cli-alpine
RUN apk add --no-cache git unzip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .
COPY --from=staging /app/vendor ./vendor/
COPY --from=staging /app/composer.lock ./composer.lock

RUN composer dump-autoload --no-interaction 2>&1 || true
RUN php artisan key:generate --force 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
