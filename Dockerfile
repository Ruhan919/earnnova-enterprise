FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json ./

# First try to update with just the manifest (no lock file needed)
# Use --no-dev --ignore-platform-reqs for fastest resolution
RUN composer update --no-interaction --no-dev --ignore-platform-reqs --prefer-dist 2>&1

COPY . .
RUN composer dump-autoload --no-interaction 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
