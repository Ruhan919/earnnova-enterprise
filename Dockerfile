FROM composer:latest AS composer
WORKDIR /app
COPY composer.json ./
RUN composer update --no-interaction --prefer-dist --ignore-platform-reqs 2>&1 || true

FROM php:8.4-cli-alpine
RUN apk add --no-cache git unzip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY . .
COPY --from=composer /app/vendor ./vendor/
COPY --from=composer /app/composer.lock ./composer.lock
RUN php artisan key:generate --force 2>&1 || true
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
