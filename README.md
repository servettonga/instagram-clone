# 📸 Innogram - Social Media Platform

Modern microservices-based social media platform built with Next.js, NestJS, and Node.js.

## 📂 Project Structure

```sh
innogram/
├── apps/
│   ├── auth-service/           # Authentication microservice (Express.js)
│   ├── core-server-app/        # Main API server (NestJS + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── init-db.sql     # Database initialization
│   │   └── scripts/
│   │       └── startup.sh      # Server startup script
│   └── client-app/             # Frontend application (Next.js)
├── init-project.sh             # Interactive setup script
├── docker-compose.yml          # Production services
├── docker-compose.dev.yml      # Development databases
└── README.md
```

## 🚀 Quick Start

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

## 🔧 Development Mode

**What it does:**

- Databases run in Docker (PostgreSQL:5433, Redis:6380, RabbitMQ:5672)
- Applications run locally with hot reload
- Best for active development

**After setup:**

```bash
npm run dev          # Start all apps locally
# OR start individually:
npm run auth:dev     # Terminal 1
npm run core:dev     # Terminal 2
npm run client:dev   # Terminal 3

# Optional: Watch mode for shared types (if actively editing them)
npm run shared-types:dev  # Terminal 4 (auto-rebuild on changes)
```

> **Note:** Shared types are automatically built during `npm install` (postinstall hook).

## 🏭 Production Mode

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

## 🌐 URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | <http://localhost:3000> | <http://localhost:3000> |
| Core API | <http://localhost:8000> | <http://localhost:8000> |
| Auth API | <http://localhost:4000> | <http://localhost:4000> |

## 🗄️ Database Ports

| Database | Development | Production |
|----------|-------------|------------|
| PostgreSQL | 5433 | 5432 |
| Redis | 6380 | 6379 |
| RabbitMQ | 5672 | 5672 |

## 📋 Available Commands

### Development

```bash
npm run docker:dev     # Start databases only
npm run dev            # Start all apps locally
npm run db:studio      # Database management UI
npm run db:push        # Update database schema
```

### Production

```bash
npm run docker:prod         # Start everything
npm run docker:prod:logs    # View all logs
npm run docker:prod:down    # Stop services
npm run docker:prod:clean   # Clean volumes
```

### Database Management

```bash
npm run db:studio      # Visual database editor
npm run db:generate    # Generate Prisma client
npm run db:reset       # Reset database ⚠️
```

## 🚨 Troubleshooting

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

## 🔐 Security

Generate secure secrets for production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Required in `.env.production`:

- `JWT_ACCESS_SECRET` (32+ characters)
- `JWT_REFRESH_SECRET` (32+ characters)
- `NEXTAUTH_SECRET` (32+ characters)
- Strong database passwords
