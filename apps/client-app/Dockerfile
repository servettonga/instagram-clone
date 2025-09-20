FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY apps/client-app/package*.json ./apps/client-app/
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
COPY apps/client-app/package*.json ./apps/client-app/
RUN npm ci

COPY . .
# Next.js requires .env
RUN touch ./apps/client-app/.env
WORKDIR /app/apps/client-app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The key insight: standalone build creates the FULL monorepo structure
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-app/.next/static ./apps/client-app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-app/public ./apps/client-app/public

# Debug final structure
RUN echo "=== Final container structure ===" && find . -name "server.js"
RUN echo "=== Static files location ===" && find . -name "*.css" | head -3
RUN echo "=== Working directory ===" && pwd && ls -la

USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/client-app/server.js"]
