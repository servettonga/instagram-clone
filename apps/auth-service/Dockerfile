# Auth Service - Production Only Dockerfile
FROM node:24-slim AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/auth-service/package*.json ./apps/auth-service/
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/auth-service/package*.json ./apps/auth-service/
# Skip postinstall here because we don't have core-server-app yet
RUN npm ci --ignore-scripts

COPY . .
WORKDIR /app/apps/auth-service
# Run build:shared-types manually since we skipped postinstall
RUN cd ../.. && npm run build:shared-types
RUN npm run build

# Production stage
FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

# Production optimizations
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

# Copy application files
COPY --from=builder --chown=express:nodejs /app/apps/auth-service/dist ./dist
COPY --from=builder --chown=express:nodejs /app/apps/auth-service/package*.json ./

# Copy built packages (shared-types)
COPY --from=builder --chown=express:nodejs /app/packages ./packages

# Copy production dependencies only
COPY --from=deps --chown=express:nodejs /app/node_modules ./node_modules

USER express

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/src/app.js"]
