# Core Server - Production Only Dockerfile
FROM node:24-slim AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/core-server-app/package*.json ./apps/core-server-app/
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/core-server-app/package*.json ./apps/core-server-app/
# Skip postinstall here because we haven't copied the prisma schema yet
RUN npm ci --ignore-scripts

COPY . .
WORKDIR /app/apps/core-server-app

# Run build:shared-types manually since we skipped postinstall
RUN cd ../.. && npm run build:shared-types

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

# Install runtime dependencies (postgresql-client for startup script, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/dist ./apps/core-server-app/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/package*.json ./apps/core-server-app/
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/prisma ./apps/core-server-app/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/core-server-app/scripts ./apps/core-server-app/scripts

# Copy built packages (shared-types)
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Make startup script executable
RUN chmod +x ./apps/core-server-app/scripts/startup.sh

# Switch to nestjs user before generating Prisma client
USER nestjs

# Generate Prisma client in the final stage for the correct platform
# We need to be in the app directory where prisma folder is located
WORKDIR /app/apps/core-server-app
RUN npx prisma generate

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Use startup script for database initialization + start
CMD ["./scripts/startup.sh"]
