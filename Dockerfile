FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json ./
RUN composer update --no-interaction --prefer-dist 2>&1 || echo "composer step done"

COPY . .

RUN php artisan key:generate --force 2>&1 || true

RUN php artisan storage:link 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
