FROM php:8.3-fpm-alpine

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
    supervisor

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

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY docker/backend/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/backend/nginx.conf /etc/nginx/nginx.conf
COPY docker/backend/default.conf /etc/nginx/conf.d/default.conf
COPY docker/backend/supervisord.conf /etc/supervisord.conf

RUN mkdir -p /var/www/html/public /var/log/nginx /var/log/php /run/nginx && \
    chown -R www-data:www-data /var/www/html /var/log/php

WORKDIR /var/www/html

# Copier le code backend
COPY backend/ .

# Vérifier que composer.json existe
RUN ls -la /var/www/html/composer.json

# Installer les dépendances AVEC un fallback si échec
RUN composer install --no-dev --optimize-autoloader --no-interaction || \
    (echo "⚠️ Composer install failed, retrying with update..." && \
     composer update --no-dev --optimize-autoloader --no-interaction)

# Vérifier que vendor existe
RUN ls -la /var/www/html/vendor/autoload_runtime.php || echo "⚠️ autoload_runtime.php not found"

# Créer les dossiers nécessaires
RUN mkdir -p config/jwt var/cache var/log && \
    chown -R www-data:www-data var/cache var/log config/jwt && \
    chmod -R 775 var/cache var/log config/jwt

# Copier et rendre exécutable le script d'entrée
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]