#!/bin/bash

set -e

# Innogram Project Initialization Script
# This script sets up the project for development or production

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${CYAN}"
cat << "EOF"
 ___
|_ _|_ __  _ __   ___   __ _ _ __ __ _ _ __ ___
 | || '_ \| '_ \ / _ \ / _` | '__/ _` | '_ ` _ \
 | || | | | | | | (_) | (_| | | | (_| | | | | | |
|___|_| |_|_| |_|\___/ \__, |_|  \__,_|_| |_| |_|
                      |___/
EOF
echo -e "${NC}"

echo -e "${BLUE}Welcome to Innogram Project Setup!${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}Node.js: $NODE_VERSION${NC}"
    else
        echo -e "${RED}Node.js is required but not installed.${NC}"
        echo -e "Please install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}npm: $NPM_VERSION${NC}"
    else
        echo -e "${RED}npm is required but not installed.${NC}"
        exit 1
    fi

    # Check Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        echo -e "${GREEN}Docker: $DOCKER_VERSION${NC}"
    else
        echo -e "${RED}Docker is required but not installed.${NC}"
        echo -e "Please install Docker from: https://docker.com/"
        exit 1
    fi

    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        echo -e "${GREEN}Docker Compose: Available${NC}"
    else
        echo -e "${RED}Docker Compose is required but not installed.${NC}"
        echo -e "Please install Docker Compose"
        exit 1
    fi

    echo -e "${GREEN}All prerequisites are satisfied!${NC}"
    echo ""
}

# Function to select setup mode
select_setup_mode() {
    echo -e "${BLUE}Please select the setup mode:${NC}"
    echo ""
    echo -e "${YELLOW}1) Development Mode${NC}"
    echo -e "   • Databases & RabbitMQ run in Docker (ports 5433, 27018, 6380, 5672, 15672)"
    echo -e "   • Applications run locally for hot reload"
    echo -e "   • Best for active development"
    echo ""
    echo -e "${YELLOW}2) Production Mode${NC}"
    echo -e "   • Everything runs in Docker containers (ports 5432, 27017, 6379, 5672, 15672)"
    echo -e "   • Applications run in containers"
    echo -e "   • Best for deployment/testing"
    echo ""

    while true; do
        read -p "Enter a choice (1-2): " choice
        case $choice in
            1)
                SETUP_MODE="development"
                break
                ;;
            2)
                SETUP_MODE="production"
                break
                ;;
            *)
                echo -e "${RED}Invalid choice. Please enter 1 or 2.${NC}"
                ;;
        esac
    done

    echo -e "${GREEN}Selected: $SETUP_MODE mode${NC}"
    echo ""
}

# Function to create environment files
setup_environment() {
    echo -e "${BLUE}Setting up environment files...${NC}"

    if [ "$SETUP_MODE" = "production" ]; then
        # Production environment
        if [ ! -f .env.production ]; then
            if [ -f .env.example ]; then
                cp .env.example .env.production
                echo -e "${GREEN}Created .env.production${NC}"
                echo -e "${YELLOW}Please edit .env.production with the production settings!${NC}"
            else
                echo -e "${RED}.env.example not found${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}.env.production already exists${NC}"
        fi
    else
        # Development environment
        if [ ! -f .env ]; then
            if [ -f .env.example ]; then
                cp .env.example .env
                echo -e "${GREEN}Created .env${NC}"
                echo -e "${YELLOW}You can edit .env with the development settings${NC}"
            else
                echo -e "${RED}.env.example not found${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}.env already exists${NC}"
        fi
    fi

    # Create symbolic links
    echo -e "${BLUE}Creating symbolic links for environment files...${NC}"

    # Remove existing symlinks/files to avoid conflicts
    find apps/ -name ".env" -type l -delete 2>/dev/null || true
    find apps/ -name ".env.production" -type l -delete 2>/dev/null || true

    # Create new symlinks
    for app in apps/*/; do
        if [ -d "$app" ]; then
            cd "$app"
            ln -sf ../../.env .env 2>/dev/null || true
            ln -sf ../../.env.production .env.production 2>/dev/null || true
            cd ../..
        fi
    done

    # Create Prisma schema symlinks
    echo -e "${BLUE}Creating Prisma schema symbolic links...${NC}"

    # Core server Prisma schema
    if [ -f "packages/prisma-schema/schema.prisma" ]; then
        mkdir -p apps/core-server-app/prisma
        cd apps/core-server-app/prisma
        ln -sf ../../../packages/prisma-schema/schema.prisma schema.prisma 2>/dev/null || true
        cd ../../..
        echo -e "${GREEN}✓ Core server schema linked${NC}"
    fi

    # Notifications consumer Prisma schema
    if [ -f "packages/prisma-schema/schema.prisma" ]; then
        mkdir -p apps/notifications-consumer/prisma
        cd apps/notifications-consumer/prisma
        ln -sf ../../../packages/prisma-schema/schema.prisma schema.prisma 2>/dev/null || true
        cd ../../..
        echo -e "${GREEN}✓ Notifications consumer schema linked${NC}"
    fi

    # Setup notifications-consumer specific environment
    setup_notifications_env

    echo -e "${GREEN}Environment files configured${NC}"
    echo ""
}

# Function to setup notifications-consumer environment
setup_notifications_env() {
    echo -e "${BLUE}Setting up notifications-consumer environment...${NC}"

    NOTIF_ENV="apps/notifications-consumer/.env"
    NOTIF_ENV_EXAMPLE="apps/notifications-consumer/.env.example"

    if [ ! -f "$NOTIF_ENV" ]; then
        if [ -f "$NOTIF_ENV_EXAMPLE" ]; then
            cp "$NOTIF_ENV_EXAMPLE" "$NOTIF_ENV"
            echo -e "${GREEN}Created notifications-consumer .env from .env.example${NC}"
            echo -e "${YELLOW}⚠ EMAIL CONFIGURATION REQUIRED!${NC}"
            echo -e "${YELLOW}  Edit: ${CYAN}$NOTIF_ENV${NC}"
            echo -e "${YELLOW}  Configure MAIL_* variables for email notifications${NC}"
            echo ""
            echo -e "${CYAN}  For Gmail:${NC}"
            echo -e "    1. Enable 2-factor authentication"
            echo -e "    2. Generate App Password: ${BLUE}https://myaccount.google.com/apppasswords${NC}"
            echo -e "    3. Use app password in MAIL_PASSWORD"
        else
            echo -e "${RED}$NOTIF_ENV_EXAMPLE not found!${NC}"
            echo -e "${YELLOW}Creating basic .env for notifications-consumer...${NC}"
            cat > "$NOTIF_ENV" << 'EOF'
# Notifications Consumer Environment Variables

NODE_ENV=development
PORT=3002

# Database (shared with core-server)
DATABASE_URL="postgresql://postgres:password@localhost:5433/innogram?schema=public"

# RabbitMQ
RABBITMQ_URL=amqp://admin:rabbitmq_password@localhost:5672

# Email Configuration (REQUIRED for email notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@innogram.com

# Application
APP_NAME=Innogram
FRONTEND_URL=http://localhost:3000
EOF
            echo -e "${GREEN}Created basic .env file${NC}"
            echo -e "${RED}⚠ YOU MUST CONFIGURE EMAIL SETTINGS!${NC}"
        fi
    else
        echo -e "${GREEN}✓ Notifications-consumer .env already exists${NC}"

        # Check if email is configured
        if grep -q "your-email@gmail.com" "$NOTIF_ENV" 2>/dev/null; then
            echo -e "${YELLOW}⚠ Email settings appear to be using default values${NC}"
            echo -e "${YELLOW}  Update MAIL_* variables in: ${CYAN}$NOTIF_ENV${NC}"
        fi
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}Installing dependencies...${NC}"

    # Check if package-lock.json exists
    if [ ! -f "package-lock.json" ]; then
        echo -e "${YELLOW}No package-lock.json found. Installing fresh...${NC}"
        npm install
    elif [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}No node_modules found. Installing...${NC}"
        npm install
    else
        echo -e "${YELLOW}Dependencies exist. Running npm ci for clean install...${NC}"
        npm ci
    fi

    # Generate Prisma Clients after dependencies are installed
    echo -e "${BLUE}Generating Prisma Clients...${NC}"

    # Core server Prisma client
    echo -e "  • Core server..."
    cd apps/core-server-app && npx prisma generate > /dev/null 2>&1 && cd ../..

    # Notifications consumer Prisma client
    echo -e "  • Notifications consumer..."
    cd apps/notifications-consumer && npx prisma generate > /dev/null 2>&1 && cd ../..

    echo -e "${GREEN}Dependencies ready${NC}"
    echo ""
}

# Function to run development setup
run_development_setup() {
    echo -e "${BLUE}Running development setup...${NC}"

    # Start development databases and RabbitMQ
    echo -e "${BLUE}Starting development infrastructure (PostgreSQL, Redis, RabbitMQ)...${NC}"
    npm run docker:dev

    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 15

    # Verify RabbitMQ is running
    if docker ps | grep -q "rabbitmq"; then
        echo -e "${GREEN}✓ RabbitMQ is running${NC}"
    else
        echo -e "${RED}⚠ RabbitMQ may not be running properly${NC}"
    fi

    echo -e "${GREEN}Development infrastructure is ready!${NC}"
    echo -e "${YELLOW}Database initialization will happen automatically when you start the core server${NC}"

    # Check for notifications-consumer .env and warn about email configuration
    if [ -f "apps/notifications-consumer/.env" ]; then
        echo -e "${GREEN}✓ Notifications consumer .env exists${NC}"
    else
        echo -e "${YELLOW}⚠ Notifications consumer .env not found - email notifications will not work${NC}"
        echo -e "${YELLOW}  Configure email settings in apps/notifications-consumer/.env${NC}"
    fi
    echo ""
}

# Function to run production setup
run_production_setup() {
    echo -e "${BLUE}Running production setup...${NC}"

    echo -e "${BLUE}Starting production services...${NC}"
    npm run docker:prod

    echo -e "${GREEN}Production setup completed!${NC}"
}

# Function to display completion message
show_completion_message() {
    echo -e "${GREEN}"
    echo "Project initialization completed successfully!"
    echo -e "${NC}"

    case $SETUP_MODE in
        development)
            echo -e "${BLUE}Next steps for DEVELOPMENT:${NC}"
            echo -e "  1. ${YELLOW}[IMPORTANT]${NC} Configure email settings for notifications:"
            echo -e "     Edit: ${CYAN}apps/notifications-consumer/.env${NC}"
            echo -e "     Update MAIL_* variables with your SMTP credentials"
            echo -e "     (Gmail users: Enable 2FA and generate App Password)"
            echo -e ""
            echo -e "  2. Start development servers:"
            echo -e "     ${CYAN}npm run dev${NC}               (Starts all services concurrently)"
            echo -e ""
            echo -e "     ${YELLOW}Or start individually in separate terminals:${NC}"
            echo -e "     ${CYAN}npm run auth:dev${NC}          (Terminal 1 - Auth Service)"
            echo -e "     ${CYAN}npm run core:dev${NC}          (Terminal 2 - Core API + WebSocket)"
            echo -e "     ${CYAN}npm run notifications:dev${NC} (Terminal 3 - Notifications Consumer)"
            echo -e "     ${CYAN}npm run client:dev${NC}        (Terminal 4 - Frontend)"
            echo -e ""
            echo -e "  3. Access services:"
            echo -e "     • Frontend:        ${BLUE}http://localhost:3000${NC}"
            echo -e "     • Core API:        ${BLUE}http://localhost:8000${NC}"
            echo -e "     • API Docs:        ${BLUE}http://localhost:8000/api/docs${NC} (Swagger)"
            echo -e "     • Auth API:        ${BLUE}http://localhost:4000${NC}"
            echo -e "     • RabbitMQ UI:     ${BLUE}http://localhost:15672${NC} (admin/rabbitmq_password)"
            echo -e "     • Prisma Studio:   ${BLUE}npm run db:studio${NC} (http://localhost:5555)"
            echo ""
            echo -e "${GREEN}Useful commands:${NC}"
            echo -e "  • ${CYAN}npm run db:studio${NC} - Database management UI"
            echo -e "  • ${CYAN}npm run db:push${NC} - Apply Prisma schema changes"
            echo -e "  • ${CYAN}npm run docker:dev:logs${NC} - View infrastructure logs"
            echo -e "  • ${CYAN}docker logs notifications-consumer -f${NC} - Watch notification processing"
            ;;
        production)
            echo -e "${BLUE}PRODUCTION setup completed:${NC}"
            echo -e "  • Frontend:        ${BLUE}http://localhost:3000${NC}"
            echo -e "  • Core API:        ${BLUE}http://localhost:8000${NC}"
            echo -e "  • API Docs:        ${BLUE}http://localhost:8000/api/docs${NC}"
            echo -e "  • Auth API:        ${BLUE}http://localhost:4000${NC}"
            echo -e "  • RabbitMQ UI:     ${BLUE}http://localhost:15672${NC}"
            echo ""
            echo -e "${RED}⚠ IMPORTANT: Edit .env.production with production secrets!${NC}"
            echo -e "${RED}  - JWT secrets (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")${NC}"
            echo -e "${RED}  - Database credentials (strong passwords)${NC}"
            echo -e "${RED}  - Email SMTP settings (for notifications)${NC}"
            echo -e "${RED}  - RabbitMQ password${NC}"
            echo -e "${RED}  - NextAuth secret${NC}"
            echo ""
            echo -e "${GREEN}Useful commands:${NC}"
            echo -e "  • ${CYAN}npm run docker:prod:logs${NC} - View all service logs"
            echo -e "  • ${CYAN}npm run docker:prod:down${NC} - Stop all services"
            echo -e "  • ${CYAN}npm run docker:prod:restart${NC} - Restart services"
            echo -e "  • ${CYAN}docker logs core-server -f${NC} - Watch core API logs"
            echo -e "  • ${CYAN}docker logs notifications-consumer -f${NC} - Watch notification processing"
            ;;
    esac

    echo ""
    echo -e "${CYAN}Documentation:${NC}"
    echo -e "  • Architecture: ${CYAN}./doc/Schemas/Project Architecture Schema.md${NC}"
    echo -e "  • Core Service: ${CYAN}./doc/Applications descriptions/1. Core Microservice.md${NC}"
    echo -e "  • Auth Service: ${CYAN}./doc/Applications descriptions/2. Authentication Microservice.md${NC}"
    echo -e "  • Notifications: ${CYAN}./doc/Applications descriptions/4. Notifications Consumer.md${NC}"
    echo -e "  • Database: ${CYAN}./doc/Applications descriptions/Core Database Implementation.md${NC}"
    echo ""
    echo -e "${YELLOW}Tip: Use Copilot instructions for development guidance!${NC}"
    echo -e "  See: ${CYAN}.github/copilot-instructions.md${NC}"
}

# Function to ask if user wants to start servers after development setup
ask_to_start_servers() {
    if [ "$SETUP_MODE" = "development" ]; then
        echo ""
        echo -e "${YELLOW}Would you like to start all development servers now? (y/n)${NC}"
        read -p "Start servers: " start_choice

        case $start_choice in
            y|Y|yes|YES)
                echo -e "${BLUE}Starting all development servers...${NC}"
                echo -e "${YELLOW}Use Ctrl+C to stop all services${NC}"
                echo ""
                npm run dev
                ;;
            *)
                echo -e "${GREEN}Setup complete! Start servers manually when ready.${NC}"
                ;;
        esac
    fi
}

# Main execution
main() {
    # Show banner and intro
    echo -e "${YELLOW}This script will help to initialize the project for development or production.${NC}"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Select setup mode
    select_setup_mode

    # Setup environment
    setup_environment

    # Install dependencies
    install_dependencies

    # Run appropriate setup
    case $SETUP_MODE in
        development)
            run_development_setup
            ;;
        production)
            run_production_setup
            ;;
    esac

    # Show completion message
    show_completion_message

    # Ask if user wants to start servers (development only)
    ask_to_start_servers
}

# Run main function
main "$@"
