# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy notification consumer app
COPY apps/notifications-consumer/ ./apps/notifications-consumer/

# Install dependencies
RUN npm ci --workspace=notifications-consumer --include-workspace-root --ignore-scripts

# Build shared types
RUN cd packages/shared-types && npm run build

# Generate Prisma Client
RUN cd apps/notifications-consumer && npx prisma generate

# Build the application
RUN npm run build --workspace=notifications-consumer

# Production stage
FROM node:24-slim AS runner

WORKDIR /app

# Install dumb-init for proper signal handling (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy notification consumer package.json
COPY apps/notifications-consumer/package*.json ./apps/notifications-consumer/

# Copy Prisma schema before installing (needed for prisma generate in postinstall)
COPY apps/notifications-consumer/prisma ./apps/notifications-consumer/prisma

# Install production dependencies only
RUN npm ci --workspace=notifications-consumer --include-workspace-root --omit=dev --ignore-scripts

# Copy built application from builder
COPY --from=builder /app/apps/notifications-consumer/dist ./apps/notifications-consumer/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built packages (shared-types)
COPY --from=builder /app/packages ./packages

# Set working directory to app
WORKDIR /app/apps/notifications-consumer

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
