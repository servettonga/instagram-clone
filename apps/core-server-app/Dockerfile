# Core Server - Production Only Dockerfile
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat curl openssl postgresql-client
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY apps/core-server-app/package*.json ./apps/core-server-app/
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
COPY apps/core-server-app/package*.json ./apps/core-server-app/
RUN npm ci

COPY . .
WORKDIR /app/apps/core-server-app

# Generate Prisma client for the current platform
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Production optimizations
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/scripts ./scripts

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Make startup script executable
RUN chmod +x ./scripts/startup.sh

# Switch to nestjs user before generating Prisma client
USER nestjs

# Generate Prisma client in the final stage for the correct platform
RUN npx prisma generate

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Use startup script for database initialization + start
CMD ["./scripts/startup.sh"]
