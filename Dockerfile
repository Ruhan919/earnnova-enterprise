FROM php:8.4-cli-alpine

RUN apk add --no-cache git unzip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Try composer install first, then update, then skip
RUN echo "📦 Installing PHP dependencies..." && \
    (composer install --no-interaction --no-scripts --ignore-platform-reqs 2>&1) || \
    (composer update --no-interaction --no-scripts --ignore-platform-reqs 2>&1) || \
    echo "⚠️ Composer skipped - vendor dir not available"

# Generate autoloader if vendor exists
RUN test -d vendor && composer dump-autoload --no-interaction 2>&1 || echo "No vendor dir"

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
