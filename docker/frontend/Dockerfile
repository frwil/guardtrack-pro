# ============================================
# STAGE 1: Dépendances
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Dépendances système pour TensorFlow.js
RUN apk add --no-cache python3 make g++ libc6-compat curl

# Copier les fichiers de dépendances (deux fichiers distincts)
COPY frontend/package.json ./
COPY frontend/package-lock.json ./

# Configuration npm et installation
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --legacy-peer-deps --no-audit --no-fund

# ============================================
# STAGE 2: Développement
# ============================================
FROM node:20-alpine AS dev
WORKDIR /app

# Dépendances système
RUN apk add --no-cache python3 make g++ libc6-compat curl bash && \
    npm install -g npm@latest

# Variables d'environnement pour le développement
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=development

# Copier les node_modules depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules/

# Copier le code source (dossier entier)
COPY frontend/ ./

EXPOSE 3000

# Commande de développement
CMD ["sh", "-c", "npm run dev"]

# ============================================
# STAGE 3: Builder (Production)
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Dépendances système pour le build
RUN apk add --no-cache python3 make g++ libc6-compat

# Copier les node_modules depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules/

# Copier le code source
COPY frontend/ ./

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production

# Build de l'application
RUN npm run build

# ============================================
# STAGE 4: Production
# ============================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public/
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static/

# Utiliser l'utilisateur non-root
USER nextjs

EXPOSE 3000

# Commande de production
CMD ["node", "server.js"]