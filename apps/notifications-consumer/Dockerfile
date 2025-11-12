# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy notification consumer app
COPY apps/notifications-consumer/ ./apps/notifications-consumer/

# Install dependencies
RUN npm ci --workspace=notifications-consumer --include-workspace-root

# Generate Prisma Client
RUN cd apps/notifications-consumer && npx prisma generate

# Build the application
RUN npm run build --workspace=notifications-consumer

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy notification consumer package.json
COPY apps/notifications-consumer/package*.json ./apps/notifications-consumer/

# Install production dependencies only
RUN npm ci --workspace=notifications-consumer --include-workspace-root --omit=dev

# Copy built application from builder
COPY --from=builder /app/apps/notifications-consumer/dist ./apps/notifications-consumer/dist
COPY --from=builder /app/apps/notifications-consumer/node_modules/.prisma ./apps/notifications-consumer/node_modules/.prisma

# Copy Prisma schema for runtime
COPY apps/notifications-consumer/prisma ./apps/notifications-consumer/prisma

# Set working directory to app
WORKDIR /app/apps/notifications-consumer

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
