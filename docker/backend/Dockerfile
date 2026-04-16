FROM php:8.3-fpm-alpine

# Installation des dépendances système
RUN apk update && apk add --no-cache \
    git \
    curl \
    zip \
    unzip \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    mysql-client \
    bash \
    nginx \
    supervisor \
    fcgi \
    openssl \
    libpng-dev \
    libxml2-dev \
    tree

# Installation des extensions PHP
RUN docker-php-ext-install \
    pdo_mysql \
    mysqli \
    mbstring \
    exif \
    bcmath \
    gd \
    intl \
    zip \
    opcache

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configuration PHP
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/custom.ini

# Configuration Nginx
COPY docker/backend/nginx.conf /etc/nginx/nginx.conf
COPY docker/backend/default.conf /etc/nginx/conf.d/default.conf

# Configuration Supervisor
COPY docker/backend/supervisord.conf /etc/supervisord.conf

# Créer les dossiers nécessaires
RUN mkdir -p /var/www/html/public /var/log/nginx /var/log/php /run/nginx && \
    chown -R www-data:www-data /var/www/html /var/log/php

WORKDIR /var/www/html

# Copier le code
COPY backend/ .

# ============================================================
# DIAGNOSTIC AVANT INSTALLATION
# ============================================================
RUN echo "=== DEBUG: Current directory contents ===" && \
    ls -la

RUN echo "=== DEBUG: composer.json exists? ===" && \
    ls -la composer.json

RUN echo "=== DEBUG: composer.lock exists? ===" && \
    ls -la composer.lock

# Installer les dépendances
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist -vvv

# ============================================================
# DIAGNOSTIC APRÈS INSTALLATION
# ============================================================
RUN echo "=== DEBUG: Checking if vendor was created ===" && \
    ls -la vendor/ 2>/dev/null || echo "❌ vendor directory NOT created"

RUN echo "=== DEBUG: Vendor directory tree (first 3 levels) ===" && \
    tree -L 2 vendor/ 2>/dev/null || find vendor/ -maxdepth 2 -type d 2>/dev/null | head -30

RUN echo "=== DEBUG: Looking for autoload files ===" && \
    find vendor/ -name "autoload*.php" 2>/dev/null

RUN echo "=== DEBUG: Looking for symfony/runtime ===" && \
    find vendor/ -path "*/symfony/runtime*" 2>/dev/null | head -10

RUN echo "=== DEBUG: Composer vendor status ===" && \
    composer show --installed 2>/dev/null | head -30

# Permissions
RUN mkdir -p config/jwt var/cache var/log && \
    chown -R www-data:www-data var/cache var/log config/jwt && \
    chmod -R 775 var/cache var/log config/jwt

# Copier et rendre exécutable le script d'entrée
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]