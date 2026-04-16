FROM php:8.3-fpm-alpine

# Installation des dépendances système
RUN apk update && apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
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
    openssl

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

# ============================================================
# ÉTAPE 1 : Copier TOUT le code backend d'abord
# ============================================================
COPY backend/ .

# DEBUG : Vérifier que composer.json est présent
RUN echo "=== DEBUG: Checking composer.json ===" && \
    ls -la /var/www/html/composer.json || echo "ERROR: composer.json not found"

# ============================================================
# ÉTAPE 2 : Installer les dépendances
# ============================================================
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# DEBUG : Vérifier que vendor a été créé
RUN echo "=== DEBUG: Checking vendor ===" && \
    ls -la /var/www/html/vendor/autoload_runtime.php || echo "ERROR: vendor not created properly"

# DEBUG : Vérifier le contenu de vendor
RUN ls -la /var/www/html/vendor/ | head -20

# ============================================================
# ÉTAPE 3 : Permissions
# ============================================================
RUN mkdir -p config/jwt var/cache var/log && \
    chown -R www-data:www-data var/cache var/log config/jwt && \
    chmod -R 775 var/cache var/log config/jwt

# Copier et rendre exécutable le script d'entrée
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]