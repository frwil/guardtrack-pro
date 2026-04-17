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
echo "Ensuring config/jwt directory exists and is writable..."
mkdir -p config/jwt
chmod 777 config/jwt

# Vérifier que le répertoire est accessible
if [ ! -w config/jwt ]; then
    echo "⚠️ config/jwt is not writable, attempting to fix permissions..."
    chmod 777 config/jwt
    [ -w config/jwt ] && echo "✅ Fixed" || echo "❌ Still not writable"
fi

# Générer les clés JWT si elles n'existent pas
if [ ! -f "config/jwt/private.pem" ] || [ ! -f "config/jwt/public.pem" ]; then
    echo "🔑 Generating JWT keys..."

    # Debug: Vérifier les outils disponibles
    echo "Checking available tools..."
    which openssl && echo "✅ OpenSSL found" || echo "❌ OpenSSL not found"
    which php && echo "✅ PHP found" || echo "❌ PHP not found"

    # Essayer avec php bin/console d'abord
    if php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction 2>&1; then
        echo "✅ Keys generated with Symfony console"
    else
        echo "⚠️ Symfony console failed, trying OpenSSL..."

        # Fallback: générer avec OpenSSL (sans passphrase d'abord)
        if openssl genrsa -out config/jwt/private.pem 4096 2>&1; then
            echo "✅ Private key generated"

            if openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem 2>&1; then
                echo "✅ Public key generated"
            else
                echo "❌ Failed to generate public key"
                cat config/jwt/private.pem
            fi
        else
            echo "❌ Failed to generate private key with OpenSSL"
            openssl version
        fi
    fi
fi

# Vérifier que les clés ont été générées
if [ ! -f "config/jwt/private.pem" ] || [ ! -f "config/jwt/public.pem" ]; then
    echo "❌ JWT key generation failed!"
    echo "Directory contents:"
    ls -la config/jwt/ 2>/dev/null || echo "Directory doesn't exist"

    echo ""
    echo "Last resort: Creating minimal test keys (FOR DEVELOPMENT ONLY)..."
    # Generate a simple RSA key pair for testing
    (cd config/jwt && php -r '
    $config = array(
        "private_key_bits" => 2048,
        "private_key_type" => OPENSSL_KEYTYPE_RSA,
    );
    $res = openssl_pkey_new($config);
    openssl_pkey_export($res, $privKey);
    $pubKey = openssl_pkey_get_details($res);
    $pubKey = $pubKey["key"];
    file_put_contents("private.pem", $privKey);
    file_put_contents("public.pem", $pubKey);
    echo "✅ Generated test keys with PHP openssl extension\n";
    ' 2>&1) || {
        echo "⚠️ Even PHP openssl failed. Application will not start without valid JWT keys."
        echo "Please ensure:"
        echo "  1. OpenSSL is installed in the container"
        echo "  2. config/jwt directory is writable"
        echo "  3. PHP openssl extension is enabled"
        exit 1
    }
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