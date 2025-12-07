FROM node:24-slim AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/client-app/package*.json ./apps/client-app/
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Build stage
FROM base AS builder

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_BASE_PATH=/innogram
ARG NEXT_PUBLIC_API_URL=https://web-dev.codes/innogram
ARG NEXT_PUBLIC_AUTH_URL=https://web-dev.codes/innogram/internal/auth

# Convert ARGs to ENVs so Next.js can access them during build
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_AUTH_URL=${NEXT_PUBLIC_AUTH_URL}

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/client-app/package*.json ./apps/client-app/
# Skip postinstall here because we don't have core-server-app yet
RUN npm ci --ignore-scripts && npm cache clean --force

COPY . .

WORKDIR /app/apps/client-app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Disable ESLint during build to save memory
ENV NEXT_IGNORE_ESLINT=1

# Run build:shared-types manually since we skipped postinstall
RUN cd ../.. && npm run build:shared-types

# Create empty .env file to satisfy Next.js
RUN touch .env

# Build Next.js app with environment variables already set via ARGs
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

USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/client-app/server.js"]
