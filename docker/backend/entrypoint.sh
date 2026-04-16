#!/bin/sh
set -e

echo "🚀 Starting GuardTrack Backend..."

# Démarrer supervisord en arrière-plan
/usr/bin/supervisord -c /etc/supervisord.conf &

# Attendre que la base de données soit prête
if [ -n "$DATABASE_URL" ]; then
    echo "⏳ Waiting for database..."
    until php bin/console doctrine:query:sql "SELECT 1" > /dev/null 2>&1; do
        sleep 2
    done
    echo "✅ Database is ready"
fi

# Générer les clés JWT si elles n'existent pas
if [ ! -f "config/jwt/private.pem" ]; then
    echo "🔑 Generating JWT keys..."
    php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction || echo "⚠️ JWT key generation failed, continuing..."
fi

# Exécuter les migrations
echo "🔄 Running database migrations..."
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration || echo "⚠️ Migrations failed, continuing..."

# Vider et réchauffer le cache
echo "🧹 Clearing cache..."
php bin/console cache:clear --env=prod || true
php bin/console cache:warmup --env=prod || true

echo "✅ Backend is ready!"

# Garder le conteneur en vie
wait