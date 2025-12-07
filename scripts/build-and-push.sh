#!/bin/bash
# Build and push Docker images to GitHub Container Registry
# Usage: ./scripts/build-and-push.sh [service1] [service2] ...
# Examples:
#   ./scripts/build-and-push.sh              # Build all services
#   ./scripts/build-and-push.sh client       # Build only client
#   ./scripts/build-and-push.sh client core  # Build client and core

set -e

# Configuration
REGISTRY="ghcr.io"
USERNAME="shosaf"
PROJECT="intern_project"
PLATFORM="linux/amd64"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service definitions: name, dockerfile, context
declare -A SERVICES=(
    ["client"]="apps/client-app/Dockerfile"
    ["core"]="apps/core-server-app/Dockerfile"
    ["auth"]="apps/auth-service/Dockerfile"
    ["notify"]="apps/notifications-consumer/Dockerfile"
)

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Build a single service
build_service() {
    local service=$1
    local dockerfile=${SERVICES[$service]}
    local image_name="${REGISTRY}/${USERNAME}/${PROJECT}-${service}:latest"
    
    if [ -z "$dockerfile" ]; then
        print_error "Unknown service: $service"
        return 1
    fi
    
    print_header "Building $service"
    print_info "Image: $image_name"
    print_info "Dockerfile: $dockerfile"
    print_info "Platform: $PLATFORM"
    
    # Build with BuildKit for better caching
    DOCKER_BUILDKIT=1 docker build \
        --platform "$PLATFORM" \
        --cache-from "$image_name" \
        -t "$image_name" \
        -f "$dockerfile" \
        . || {
            print_error "Failed to build $service"
            return 1
        }
    
    print_success "Built $service successfully"
    
    # Show image size
    local size=$(docker images "$image_name" --format "{{.Size}}")
    print_info "Image size: $size"
    
    return 0
}

# Push a single service
push_service() {
    local service=$1
    local image_name="${REGISTRY}/${USERNAME}/${PROJECT}-${service}:latest"
    
    print_header "Pushing $service"
    print_info "Image: $image_name"
    
    docker push "$image_name" || {
        print_error "Failed to push $service"
        return 1
    }
    
    print_success "Pushed $service successfully"
    return 0
}

# Build and push a service
build_and_push_service() {
    local service=$1
    
    if build_service "$service"; then
        if push_service "$service"; then
            return 0
        fi
    fi
    
    return 1
}

# Main script
main() {
    print_header "Docker Build & Push Script"
    
    # Check Docker
    check_docker
    
    # Determine which services to build
    local services_to_build=()
    
    if [ $# -eq 0 ]; then
        # No arguments - build all services
        print_info "No services specified, building all services"
        services_to_build=("${!SERVICES[@]}")
    else
        # Build specified services
        services_to_build=("$@")
    fi
    
    # Sort services for consistent output
    IFS=$'\n' services_to_build=($(sort <<<"${services_to_build[*]}"))
    unset IFS
    
    print_info "Services to build: ${services_to_build[*]}"
    echo ""
    
    # Track results
    local successful=()
    local failed=()
    
    # Build and push each service
    for service in "${services_to_build[@]}"; do
        if build_and_push_service "$service"; then
            successful+=("$service")
        else
            failed+=("$service")
        fi
    done
    
    # Print summary
    print_header "Build Summary"
    
    if [ ${#successful[@]} -gt 0 ]; then
        print_success "Successfully built and pushed: ${successful[*]}"
    fi
    
    if [ ${#failed[@]} -gt 0 ]; then
        print_error "Failed to build or push: ${failed[*]}"
        exit 1
    fi
    
    print_success "All services built and pushed successfully!"
    
    # Show final images
    echo ""
    print_info "Final images:"
    docker images "${REGISTRY}/${USERNAME}/${PROJECT}-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

# Run main function
main "$@"
