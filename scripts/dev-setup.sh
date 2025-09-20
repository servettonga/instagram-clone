#!/bin/bash

set -e

echo "Starting Polaroid DEVELOPMENT setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW} .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env file for DEVELOPMENT${NC}"
        echo -e "${RED}Please edit .env with your development passwords and secrets!${NC}"
    else
        echo -e "${RED}.env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Create symbolic links for environment files in each service
echo -e "${BLUE}Creating symbolic links for environment files...${NC}"
cd apps/auth-service && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
cd apps/core-server-app && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
cd apps/client-app && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
echo -e "${GREEN}Created symbolic links${NC}"

# Install dependencies using npm workspaces
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Start ONLY development databases (not application services)
echo -e "${BLUE}Starting DEVELOPMENT databases (PostgreSQL:5433, MongoDB:27018, Redis:6380)...${NC}"
npm run docker:dev

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 15

# Generate Prisma client and push schema
echo -e "${BLUE}Setting up database schema...${NC}"
npm run db:generate
npm run db:push

echo -e "${GREEN}Development setup complete!${NC}"
echo -e "${BLUE}Next steps for DEVELOPMENT:${NC}"
echo -e "  1. Edit .env with your development passwords/secrets"
echo -e "  2. Start development servers (apps run locally):"
echo -e "     ${YELLOW}npm run auth:dev${NC}     (Terminal 1)"
echo -e "     ${YELLOW}npm run core:dev${NC}     (Terminal 2)"
echo -e "     ${YELLOW}npm run client:dev${NC}   (Terminal 3)"
echo -e "  3. Or start all at once: ${YELLOW}npm run dev${NC}"
echo -e "  4. Visit: ${BLUE}http://localhost:3000${NC}"
echo -e ""
echo -e "${GREEN}Pro tip: Use 'npm run db:studio' to manage your database visually${NC}"
echo -e "${BLUE}Databases running in Docker on dev ports (5433, 27018, 6380)${NC}"
