# Shared Prisma Schema

This package contains the shared Prisma schema used by all services in the monorepo.

## Purpose

Having a single source of truth for the database schema ensures:

- **Consistency**: All services use the same database structure
- **Single Maintenance Point**: Schema changes are made in one place
- **Type Safety**: All services get the same TypeScript types
- **Migration Management**: Migrations are tracked in one location

## Structure

```txt
packages/prisma-schema/
├── schema.prisma         # Main schema file
├── migrations/          # Database migration history
└── package.json         # Schema-specific scripts
```

## Usage

### Services Using This Schema

Both services use symlinks to reference this shared schema:

- `apps/core-server-app/prisma/schema.prisma` → `packages/prisma-schema/schema.prisma`
- `apps/notifications-consumer/prisma/schema.prisma` → `packages/prisma-schema/schema.prisma`

### Making Schema Changes

1. **Edit the schema** in `packages/prisma-schema/schema.prisma`

2. **Create a migration**:

   ```bash
   cd apps/core-server-app  # or any app using the schema
   npx prisma migrate dev --name your_migration_name
   ```

3. **Regenerate Prisma Client** for all services:

   ```bash
   # From root
   npm run db:generate

   # Or manually for each service
   cd apps/core-server-app && npx prisma generate
   cd apps/notifications-consumer && npx prisma generate
   ```

### Key Commands

From the `packages/prisma-schema` directory:

```bash
# Generate Prisma Client
npm run generate

# Create a new migration (dev)
npm run migrate:dev

# Apply migrations (production)
npm run migrate:deploy

# Push schema changes without migration (dev only)
npm run db:push

# Open Prisma Studio
npm run studio
```

## Migration Files Location

Migration files are stored in `apps/core-server-app/prisma/migrations/` because:

- Migrations need to be near the service that applies them
- The migration history is shared via git
- Each service can apply the same migrations to their database

## Important Notes

### Symlinks

- The schema files in each app are **symlinks** to this package
- Changes to the schema in any location affect all services
- Git tracks the symlinks, not duplicate files

### Database Connections

- Each service maintains its own `.env` file with `DATABASE_URL`
- Both services can connect to the same database (current setup)
- Or each service can have its own database instance (future microservices)

### Type Generation

- Prisma Client is generated to `node_modules/@prisma/client`
- This is shared across the monorepo
- Each service imports from the same generated client
