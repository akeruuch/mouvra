FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:php

FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install pdo_mysql mbstring \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*
COPY backend/docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY backend/docker/php.ini /usr/local/etc/php/conf.d/mouvra.ini
COPY backend/ /var/www/backend/
COPY research/mice.json /var/www/backend/data/mice.json
COPY --from=frontend /app/dist/php/ /var/www/html/
COPY backend/public/api.php /var/www/html/api.php
EXPOSE 80
