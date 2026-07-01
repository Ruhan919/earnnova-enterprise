FROM php:8.4-fpm-alpine

RUN apk add --no-cache nginx supervisor && \
    docker-php-ext-install pdo pdo_mysql mbstring bcmath xml zip gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist --no-dev 2>&1 || \
    composer update --no-interaction 2>&1 || true

COPY . .
RUN php artisan key:generate --force 2>&1 || true

RUN mkdir -p /run/nginx && echo 'server { \
    listen 8080; root /var/www/html/public; index index.php; \
    location / { try_files $uri $uri/ /index.php?$query_string; } \
    location ~ \.php$ { fastcgi_pass 127.0.0.1:9000; \
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
    include fastcgi_params; } }' > /etc/nginx/http.d/default.conf

RUN echo '[supervisord] nodaemon=true user=root \
    [program:php-fpm] command=php-fpm -F autostart=true autorestart=true \
    [program:nginx] command=nginx -g "daemon off;" autostart=true autorestart=true' > /etc/supervisord.conf

RUN chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

EXPOSE 8080
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
