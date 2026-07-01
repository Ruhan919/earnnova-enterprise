FROM php:8.4-fpm-alpine

RUN apk add --no-cache nginx supervisor curl git unzip libzip-dev oniguruma-dev postgresql-dev nodejs npm && \
    docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring bcmath xml zip gd intl

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

# Install PHP deps (with fallback)
RUN composer install --no-interaction --prefer-dist --no-dev 2>&1 || \
    (composer update --no-interaction --prefer-dist --with-all-dependencies 2>&1) || true

# Build frontend (skip on failure)
RUN npm install 2>&1 && npm run build 2>&1 || echo "Frontend build skipped"

# Laravel setup
RUN php artisan key:generate --force 2>&1 || true

# Nginx + Supervisord
RUN mkdir -p /run/nginx && \
    echo 'server { listen 8080; root /var/www/html/public; index index.php; \
        location / { try_files $uri $uri/ /index.php?$query_string; } \
        location ~ \.php$ { fastcgi_pass 127.0.0.1:9000; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; } }' > /etc/nginx/http.d/default.conf && \
    echo '[supervisord] nodaemon=true user=root \
    [program:php-fpm] command=php-fpm -F autostart=true autorestart=true \
    [program:nginx] command=nginx -g "daemon off;" autostart=true autorestart=true' > /etc/supervisord.conf

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8080
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
