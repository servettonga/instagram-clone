#!/bin/bash
# Docker cleanup script - removes unused images, containers, and build cache

set -e

echo "Docker Cleanup Script"
echo "========================"
echo ""

# Show current disk usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Remove stopped containers
echo "  Removing stopped containers..."
docker container prune -f

# Remove dangling images (untagged)
echo "  Removing dangling images..."
docker image prune -f

# Remove unused images (not just dangling)
echo "  Removing unused images..."
docker image prune -a -f --filter "until=24h"

# Remove build cache
echo "  Removing build cache..."
docker builder prune -f

# Remove unused volumes
echo "  Removing unused volumes..."
docker volume prune -f

# Remove unused networks
echo "  Removing unused networks..."
docker network prune -f

# Full system prune (optional - uncomment if needed)
# echo "  Running full system prune..."
# docker system prune -a -f --volumes

echo ""
echo " Cleanup complete!"
echo ""
echo " New Docker disk usage:"
docker system df
echo ""

# Show remaining images
echo " Remaining images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
