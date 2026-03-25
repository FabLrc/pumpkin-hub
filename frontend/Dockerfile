# PRODUCTION — build multi-stage Next.js (standalone)

# ---- Stage 1 : dépendances ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2 : build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Les NEXT_PUBLIC_* sont inlinés au build (pas disponibles à runtime).
# Passer ces valeurs via --build-arg dans docker.yml / docker buildx.
ARG NEXT_PUBLIC_API_URL=https://api.pumpkinhub.org
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_S3_PUBLIC_URL=https://r2.pumpkinhub.org
ENV NEXT_PUBLIC_S3_PUBLIC_URL=$NEXT_PUBLIC_S3_PUBLIC_URL

ARG NEXT_PUBLIC_S3_PRESIGNED_ORIGIN
ENV NEXT_PUBLIC_S3_PRESIGNED_ORIGIN=$NEXT_PUBLIC_S3_PRESIGNED_ORIGIN

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---- Stage 3 : runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone inclut uniquement les fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1

# server.js est généré par Next.js en mode standalone
CMD ["node", "server.js"]
