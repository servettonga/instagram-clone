# Innogram - Social Media Platform

Modern microservices-based social media platform built with Next.js, NestJS, and Node.js.

## Features

### User Management

- **Authentication**: JWT-based auth with access/refresh tokens
- **OAuth Integration**: Google and GitHub login support
- **Profile Management**: Public/private profiles with avatars, bios, and display names
- **Follow System**: Follow/unfollow users with follow request approval for private accounts
- **User Discovery**: Search for users by username

### Posts & Content

- **Image Posts**: Upload single or multiple images (up to 10) with various aspect ratios (1:1, 4:5, 16:9)
- **Captions**: Rich text captions with @mention support
- **Post Management**: Edit captions, archive/unarchive, and delete posts
- **Saved Posts**: Save posts for later viewing in your profile's Saved tab
- **Post Interactions**: Like posts and view like counts

### Comments & Engagement

- **Nested Comments**: Comment on posts with unlimited reply depth
- **Comment Likes**: Like comments to show appreciation
- **@Mentions**: Mention users in comments and captions
- **Real-time Updates**: Comment counts update dynamically

### Messaging (Real-time)

- **WebSocket Chat**: Real-time messaging using Socket.IO
- **File Sharing**: Send images and files in chats
- **Chat Management**: Create, delete, and manage conversations
- **Message Status**: Read receipts and delivery status
- **Typing Indicators**: See when someone is typing

### Notifications

- **Real-time Alerts**: Instant notifications for interactions
- **Notification Types**: Follow requests, likes, comments, mentions, and more
- **Email Notifications**: Configurable email alerts via RabbitMQ queue
- **Notification Center**: View and manage all notifications in one place

### Feed & Discovery

- **Personalized Feed**: See posts from followed users
- **User Profiles**: View user profiles with post grids
- **Activity Tracking**: Monitor likes, comments, and interactions
- **Archive**: Hide posts from your profile while keeping them accessible

## Project Structure

```sh
innogram/
├── apps/
│   ├── auth-service/              # Authentication microservice (Express.js + Redis)
│   ├── core-server-app/           # Main API Gateway + Business Logic (NestJS + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Symlink to shared schema
│   │   │   └── init-db.sql        # Database initialization
│   │   ├── scripts/
│   │   │   └── startup.sh         # Server startup script
│   │   └── uploads/               # User-uploaded files (images, assets)
│   ├── client-app/                # Frontend application (Next.js 16 + NextAuth)
│   └── notifications-consumer/    # Async notification processor (NestJS + RabbitMQ)
│       └── prisma/
│           └── schema.prisma      # Symlink to shared schema
├── packages/
│   ├── prisma-schema/             # Shared Prisma schema (single source of truth)
│   │   └── schema.prisma
│   ├── shared-types/              # Shared TypeScript types across services
│   │   └── src/
│   ├── eslint-config/             # Shared ESLint configurations
│   └── typescript-config/         # Shared TypeScript configurations
├── init-project.sh                # Interactive setup script
├── docker-compose.yml             # Production services
├── docker-compose.dev.yml         # Development databases
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 24+
- Docker & Docker Compose
- Git (for Git Bash on Windows)

### One-Command Setup

```bash
git clone <repo>
cd <project-directory>
chmod +x init-project.sh
./init-project.sh
```

The interactive setup will guide you through:

1. **Development Mode** - Apps locally + databases in Docker
2. **Production Mode** - Everything in Docker containers

## Development Mode

**What it does:**

- Databases run in Docker (PostgreSQL:5433, Redis:6380, RabbitMQ:5672)
- Applications run locally with hot reload
- Best for active development

**After setup:**

```bash
npm run dev          # Start all apps locally (concurrent mode)

# OR start individually in separate terminals:
npm run auth:dev              # Terminal 1 - Auth Service
npm run core:dev              # Terminal 2 - Core API + WebSocket
npm run notifications:dev     # Terminal 3 - Notifications Consumer
npm run client:dev            # Terminal 4 - Frontend

# Database management:
npm run db:studio             # Prisma Studio UI
npm run db:push               # Apply schema changes (dev only)
npm run db:generate           # Regenerate Prisma clients

# Optional: Watch mode for shared types (if actively editing them)
npm run shared-types:dev      # Auto-rebuild on changes
```

> **Note:** Shared types are automatically built during `npm install` (postinstall hook).

## Production Mode

**What it does:**

- Everything runs in Docker containers
- Uses standard ports (PostgreSQL:5432, Redis:6379, RabbitMQ:5672)
- Production-ready deployment

**After setup:**

```bash
# Edit .env.production with secure values!
npm run docker:prod         # Start everything
npm run docker:prod:logs    # View logs
```

## Service URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | <http://localhost:3000> | <http://localhost:3000> |
| Core API | <http://localhost:8000> | <http://localhost:8000> |
| Core API Docs | <http://localhost:8000/api/docs> | <http://localhost:8000/api/docs> |
| Auth API | <http://localhost:4000> | <http://localhost:4000> |
| RabbitMQ UI | <http://localhost:15672> | <http://localhost:15672> |
| Prisma Studio | <http://localhost:5555> | N/A |

## Database Ports

| Database | Development | Production |
|----------|-------------|------------|
| PostgreSQL | 5433 | 5432 |
| Redis | 6380 | 6379 |
| RabbitMQ | 5672 | 5672 |

## Available Commands

### Development

```bash
# Infrastructure
npm run docker:dev              # Start PostgreSQL, Redis, RabbitMQ
npm run docker:dev:logs         # View infrastructure logs
npm run docker:dev:down         # Stop infrastructure
npm run docker:dev:clean        # Clean infrastructure volumes

# Applications
npm run dev                     # Start all apps (auth, core, notifications, client)
npm run auth:dev                # Start auth service only
npm run core:dev                # Start core API only
npm run notifications:dev       # Start notifications consumer only
npm run client:dev              # Start frontend only

# Database
npm run db:studio               # Prisma Studio UI
npm run db:push                 # Apply schema changes (dev only)
npm run db:generate             # Regenerate Prisma clients
npm run db:reset                # Reset database

# Shared Types
npm run build:shared-types      # Build shared types package
npm run shared-types:dev        # Watch mode for shared types
```

### Production

```bash
npm run docker:prod             # Start everything in Docker
npm run docker:prod:logs        # View all service logs
npm run docker:prod:down        # Stop all services
npm run docker:prod:clean       # Clean all volumes
npm run docker:prod:restart     # Restart services
```

### Database Management

```bash
npm run db:studio      # Visual database editor
npm run db:generate    # Generate Prisma client
npm run db:reset       # Reset database
```

## Troubleshooting

### Port Conflicts

```bash
lsof -i :3000                    # Check port usage
kill -9 $(lsof -t -i :3000)     # Kill process
```

### Database Issues

```bash
npm run docker:dev:clean   # Reset dev databases
npm run docker:dev         # Restart databases
```

### Fresh Start

```bash
npm run clean:all          # Clean everything
./init-project.sh          # Re-run setup
```

### Health Checks

```bash
npm run health:check       # Test all services
curl http://localhost:3000        # Frontend
curl http://localhost:4000/health # Auth API
curl http://localhost:8000/health # Core API
```

## Architecture

### Microservices

- **auth-service**: JWT token generation/validation, OAuth 2.0, Redis session storage
- **core-server-app**: API Gateway + business logic, Prisma ORM, PostgreSQL, WebSocket (Socket.IO)
- **notifications-consumer**: RabbitMQ consumer for async email notifications
- **client-app**: Next.js frontend with NextAuth

### Communication

- **HTTP**: Client → Core API → Auth API (for token validation)
- **WebSocket**: Client ↔ Core API (for real-time chat)
- **RabbitMQ**: Core API → Notifications Consumer (async events)

### Key Patterns

- **Token Validation**: Core service calls auth service's `/internal/auth/validate` endpoint
- **Shared Schema**: Single Prisma schema (`packages/prisma-schema`) symlinked to services
- **Shared Types**: TypeScript types package auto-built on install
- **Guards**: `@UseGuards(AccessGuard)` for protected routes, `@Public()` to skip auth

## Security

Generate secure secrets for production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Required in `.env.production`:

- `JWT_ACCESS_SECRET` (32+ characters)
- `JWT_REFRESH_SECRET` (32+ characters)
- `NEXTAUTH_SECRET` (32+ characters)
- Strong database passwords
- Email SMTP credentials (for notifications)
