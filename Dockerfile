FROM php:8.4-fpm-alpine

# System dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libxml2-dev \
    oniguruma-dev \
    postgresql-dev \
    nodejs \
    npm

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    mbstring \
    bcmath \
    xml \
    zip \
    gd \
    intl

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# App
WORKDIR /var/www/html
COPY . .

# Install dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev && \
    npm install --legacy-peer-deps && \
    npm run build && \
    php artisan key:generate --force && \
    php artisan optimize

# Nginx config
RUN mkdir -p /run/nginx && \
    echo 'server { \
        listen 8080; \
        root /var/www/html/public; \
        index index.php; \
        server_name _; \
        add_header X-Frame-Options "SAMEORIGIN"; \
        add_header X-Content-Type-Options "nosniff"; \
        add_header X-XSS-Protection "1; mode=block"; \
        location / { \
            try_files $uri $uri/ /index.php?$query_string; \
        } \
        location ~ \.php$ { \
            fastcgi_pass 127.0.0.1:9000; \
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
            include fastcgi_params; \
        } \
        location ~ /\.(?!well-known) { deny all; } \
    }' > /etc/nginx/http.d/default.conf

# Supervisor config
RUN echo '[supervisord] \
    nodaemon=true \
    user=root \
    [program:php-fpm] \
    command=php-fpm -F \
    autostart=true \
    autorestart=true \
    [program:nginx] \
    command=nginx -g "daemon off;" \
    autostart=true \
    autorestart=true' > /etc/supervisord.conf

# Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
