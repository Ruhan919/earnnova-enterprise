FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Key: use --ignore-platform-reqs and --no-scripts to avoid common failures
RUN composer install --no-interaction --no-scripts --ignore-platform-reqs 2>&1 || true
RUN composer dump-autoload --no-interaction 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
