FROM php:8.4-cli-alpine

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-interaction 2>&1 || true

RUN php artisan key:generate --force 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
