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

# Définir JWT_PASSPHRASE par défaut si non défini
if [ -z "$JWT_PASSPHRASE" ]; then
    export JWT_PASSPHRASE="default_passphrase_change_me_in_production"
    echo "⚠️ JWT_PASSPHRASE not set, using default"
fi

# Créer le répertoire config/jwt s'il n'existe pas
mkdir -p config/jwt
chmod 777 config/jwt

# Générer les clés JWT si elles n'existent pas
if [ ! -f "config/jwt/private.pem" ] || [ ! -f "config/jwt/public.pem" ]; then
    echo "🔑 Generating JWT keys using Symfony console..."

    # Essayer avec php bin/console d'abord
    if php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction 2>/dev/null; then
        echo "✅ Keys generated with Symfony console"
    else
        echo "⚠️ Symfony console failed, using OpenSSL directly..."

        # Fallback: générer avec OpenSSL
        openssl genrsa -out config/jwt/private.pem -aes256 -passout pass:"${JWT_PASSPHRASE}" 4096 2>/dev/null || \
        openssl genrsa -out config/jwt/private.pem 4096 2>/dev/null

        openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem -passin pass:"${JWT_PASSPHRASE}" 2>/dev/null || \
        openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem 2>/dev/null
    fi
fi

# Vérifier que les clés ont été générées
if [ ! -f "config/jwt/private.pem" ] || [ ! -f "config/jwt/public.pem" ]; then
    echo "❌ ERROR: JWT keys generation failed!"
    echo "Debug: Listing config/jwt contents:"
    ls -la config/jwt/ || echo "Directory doesn't exist"
    exit 1
fi

# Corriger les permissions
chmod 644 config/jwt/private.pem config/jwt/public.pem
echo "✅ JWT keys ready"

# Exporter les clés comme variables d'environnement en base64
echo "📝 Exporting JWT keys as environment variables..."
export JWT_SECRET_KEY="$(cat config/jwt/private.pem | base64 -w 0)"
export JWT_PUBLIC_KEY="$(cat config/jwt/public.pem | base64 -w 0)"

# Vérifier que les variables sont définies
if [ -z "$JWT_SECRET_KEY" ] || [ -z "$JWT_PUBLIC_KEY" ]; then
    echo "❌ ERROR: Failed to export JWT keys as environment variables!"
    exit 1
fi

echo "✅ JWT keys exported successfully"

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