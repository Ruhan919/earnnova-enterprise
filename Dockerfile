# Stage 1: Resolve dependencies using the composer image
FROM composer:latest AS staging
WORKDIR /app
COPY composer.json ./
RUN composer update --no-interaction --prefer-dist --no-dev 2>&1

# Stage 2: Run the app
FROM php:8.4-cli-alpine
RUN apk add --no-cache git unzip

WORKDIR /app
COPY . .
COPY --from=staging /app/vendor ./vendor/
COPY --from=staging /app/composer.lock ./composer.lock

RUN composer dump-autoload --no-interaction 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
