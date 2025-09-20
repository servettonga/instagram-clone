# 📸 Polaroid - Social Media Platform

Modern microservices-based social media platform built with Next.js, NestJS, and Node.js.

## 🏗️ Architecture

```sh
📁 polaroid/
├── apps/
│   ├── auth-service/       # Node.js/Express
│   ├── core-server-app/    # NestJS
│   └── client-app/         # Next.js
├── scripts/               # Setup scripts
├── docker-compose.yml     # Production
└── docker-compose.dev.yml # Development databases
```

## 🚀 Quick Start

### Prerequisites

- Node.js 24+
- Docker & Docker Compose

### Development

```bash
git clone <repo>
cd polaroid
npm run setup:dev    # One-time setup
npm run docker:dev   # Start databases
npm run dev          # Start all apps locally
```

### Production

```bash
npm run setup:prod   # One-time setup
# Edit .env.production with secure values
npm run docker:prod  # Everything in Docker
```

## 🔧 Environment

### Development (.env)

- Apps run **locally** with hot reload
- Databases in **Docker** (ports 5433, 27018, 6380)

### Production (.env.production)

- Everything in **Docker** containers
- Standard ports (5432, 27017, 6379)

## 📋 Commands

### Development

```bash
npm run docker:dev     # Start databases
npm run auth:dev       # Auth service locally
npm run core:dev       # Core server locally
npm run client:dev     # Frontend locally
npm run dev            # All services at once

npm run db:studio      # Database UI
npm run db:push        # Update schema
```

### Production

```bash
npm run docker:prod         # Start everything
npm run docker:prod:logs    # View logs
npm run docker:prod:down    # Stop services
npm run docker:prod:clean   # Clean volumes
```

## 🌐 URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | <http://localhost:3000> | <http://localhost:3000> |
| Core API | <http://localhost:8000> | <http://localhost:8000> |
| Auth API | <http://localhost:4000> | <http://localhost:4000> |

## 🔧 Database

### Ports

| Database | Development | Production |
|----------|-------------|------------|
| PostgreSQL | 5433 | 5432 |
| MongoDB | 27018 | 27017 |
| Redis | 6380 | 6379 |

### Management

```bash
npm run db:studio    # Visual editor
npm run db:generate  # Generate Prisma client
npm run db:reset     # Reset database ⚠️
```

## 🚨 Troubleshooting

### Port conflicts

```bash
lsof -i :3000      # Check port usage
kill -9 $(lsof -t -i :3000)  # Kill process
```

### Database issues

```bash
npm run docker:dev:clean   # Reset databases
npm run docker:dev         # Restart
```

### Health checks

```bash
curl http://localhost:3000        # Frontend
curl http://localhost:4000/health # Auth
curl http://localhost:8000/health # Core
```

## 📂 Project Structure

```sh
apps/
├── auth-service/      # Authentication (Express)
├── core-server-app/   # Main API (NestJS + Prisma)
└── client-app/        # Frontend (Next.js)
```

## 🔐 Security

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Required in `.env`:

- `JWT_ACCESS_SECRET` (32+ chars)
- `JWT_REFRESH_SECRET` (32+ chars)
- `NEXTAUTH_SECRET` (32+ chars)
- Database passwords

---

**Development**: Databases in Docker + Apps local
**Production**: Everything in Docker
