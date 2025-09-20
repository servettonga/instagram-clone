#!/bin/bash

set -e

echo "Starting Polaroid PRODUCTION setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW} .env.production file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.production
        echo -e "${GREEN}Created .env.production file${NC}"
        echo -e "${RED}Please edit .env.production with your production passwords and secrets!${NC}"
    else
        echo -e "${RED}.env.example not found. Please create .env.production manually.${NC}"
        exit 1
    fi
fi

# Create symbolic links for environment files in each service
echo -e "${BLUE}🔗 Creating symbolic links for environment files...${NC}"
cd apps/auth-service && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
cd apps/core-server-app && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
cd apps/client-app && ln -sf ../../.env .env && ln -sf ../../.env.production .env.production && cd ../..
echo -e "${GREEN}Created symbolic links${NC}"

# Install dependencies using npm workspaces
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Build and start PRODUCTION services (everything in Docker)
echo -e "${BLUE}Starting PRODUCTION services (PostgreSQL:5432, MongoDB:27017, Redis:6379)...${NC}"
npm run docker:prod

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 30

echo -e "${GREEN}Production setup complete!${NC}"
echo -e "${BLUE}Production services running:${NC}"
echo -e "  Frontend: http://localhost:3000"
echo -e "  Core API: http://localhost:8000"
echo -e "  Auth API: http://localhost:4000"
echo -e ""
echo -e "${GREEN}Pro tip: Use 'npm run docker:prod:logs' to monitor all services${NC}"
echo -e "${BLUE}All services running in Docker containers on standard ports${NC}"
