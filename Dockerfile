FROM php:8.4-cli

RUN apt-get update -qq && apt-get install -y -qq git unzip libzip-dev 2>&1 | tail -3 && \
    docker-php-ext-install pdo pdo_mysql mbstring bcmath xml zip gd 2>&1 | tail -3

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer update --no-interaction --prefer-dist 2>&1 | tail -20 || \
    echo "composer step done"
RUN composer dump-autoload --no-interaction 2>&1 || true

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
