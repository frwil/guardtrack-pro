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
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction || true

RUN mkdir -p config/jwt var/cache var/log && \
    chown -R www-data:www-data var/cache var/log config/jwt && \
    chmod -R 775 var/cache var/log config/jwt

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]