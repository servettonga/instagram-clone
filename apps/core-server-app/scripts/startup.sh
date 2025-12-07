#!/bin/bash

# Core Server Startup Script - Handles database initialization for both dev and production

set -e

echo "Starting Innogram Core Server..."

# Database connection details from environment
DB_HOST=${POSTGRES_HOST:-localhost}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-password}

# Application database user (for actual connections)
APP_DB_USER=${APP_DB_USER:-innogram_user}
APP_DB_PASSWORD=${APP_DB_PASSWORD:-innogram_app_password}

# Use environment port or default based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    DB_PORT=${POSTGRES_PORT:-5432}
    echo "Production mode - PostgreSQL port: $DB_PORT"
else
    # In development, use the mapped port (5433) unless overridden
    DB_PORT=${POSTGRES_PORT:-5433}
    echo "Development mode - PostgreSQL port: $DB_PORT"
fi

echo "Waiting for PostgreSQL ($DB_HOST:$DB_PORT)..."

# Wait for PostgreSQL to be ready with timeout
TIMEOUT=60
COUNTER=0

until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping (${COUNTER}s/${TIMEOUT}s)"
    sleep 2
    COUNTER=$((COUNTER + 2))

    if [ $COUNTER -ge $TIMEOUT ]; then
        echo "ERROR: PostgreSQL connection timeout after ${TIMEOUT}s"
        echo "Please check:"
        echo "  - Docker containers are running: docker ps"
        echo "  - PostgreSQL port is accessible: nc -zv $DB_HOST $DB_PORT"
        echo "  - Environment variables are correct"
        exit 1
    fi
done

echo "PostgreSQL is ready!"

# Initialize databases and create application user (using superuser)
echo "Initializing databases and application user..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -f prisma/init-db.sql || true

# Test application user connection
echo "Testing application user connection..."
until PGPASSWORD=$APP_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $APP_DB_USER -d innogram -c '\q' 2>/dev/null; do
    echo "Application user not ready yet - waiting..."
    sleep 2
done

echo "Application user connection verified!"

# Generate Prisma client and run migrations
echo "Setting up database schema..."
npx prisma generate
npx prisma db push

echo "Core Server is ready to start!"

# Start the application based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting production server..."
    exec node dist/src/main.js
else
    echo "Starting development server..."
    exec npm run start:dev
fi
