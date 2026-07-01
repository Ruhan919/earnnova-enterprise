FROM php:8.4-fpm-alpine

# System dependencies (Alpine package names)
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
    npm \
    && rm -rf /var/cache/apk/*

# PHP extensions
RUN docker-php-ext-install \
    pdo pdo_mysql pdo_pgsql \
    mbstring bcmath xml zip gd intl \
    && docker-php-ext-enable pdo pdo_mysql pdo_pgsql mbstring bcmath xml zip gd intl

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy app files
COPY . .

# Install PHP dependencies (composer will generate lock file from composer.json)
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev 2>&1 || \
    (echo "📦 composer failed, retrying with update..." && \
     composer update --no-interaction --prefer-dist --with-all-dependencies 2>&1)

# Install frontend dependencies and build
RUN npm install 2>&1 && \
    npm run build 2>&1 || \
    (echo "⚠️  npm build failed, continuing..." && true)

# Laravel setup
RUN php artisan key:generate --force 2>&1 || true && \
    php artisan optimize 2>&1 || true && \
    php artisan storage:link 2>&1 || true

# Nginx config
RUN mkdir -p /run/nginx && \
    echo 'server { \
        listen 8080; \
        root /var/www/html/public; \
        index index.php index.html; \
        server_name _; \
        add_header X-Frame-Options "SAMEORIGIN"; \
        add_header X-Content-Type-Options "nosniff"; \
        location / { \
            try_files $uri $uri/ /index.php?$query_string; \
        } \
        location ~ \.php$ { \
            fastcgi_pass 127.0.0.1:9000; \
            fastcgi_param SCRIPT_FILENAME $$document_root$$fastcgi_script_name; \
            include fastcgi_params; \
            fastcgi_param APP_ENV production; \
        } \
        location ~ /\.(?!well-known) { deny all; } \
    }' > /etc/nginx/http.d/default.conf

# Supervisor config
RUN echo '[supervisord] \
    nodaemon=true \
    user=root \
    loglevel=warn \
    [program:php-fpm] \
    command=php-fpm -F \
    autostart=true \
    autorestart=true \
    stdout_logfile=/dev/stdout \
    stderr_logfile=/dev/stderr \
    [program:nginx] \
    command=nginx -g "daemon off;" \
    autostart=true \
    autorestart=true \
    stdout_logfile=/dev/stdout \
    stderr_logfile=/dev/stderr' > /etc/supervisord.conf

# Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
