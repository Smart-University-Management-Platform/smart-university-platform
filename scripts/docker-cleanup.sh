#!/bin/bash
# ============================================================
# Docker Cleanup Script for Linux/macOS
# Safely removes unused Docker resources to free disk space
# ============================================================
#
# Usage: ./scripts/docker-cleanup.sh [options]
#
# Options:
#   --all     : Deep clean (includes all unused images, not just dangling)
#   --volumes : Also remove unused volumes (WARNING: may delete data)
#
# Safe by default: Only removes stopped containers, dangling images,
#                  and build cache. Running containers are preserved.
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}       Docker Cleanup Utility - Smart University${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Parse arguments
CLEAN_ALL=false
CLEAN_VOLUMES=false

for arg in "$@"; do
    case $arg in
        --all)
            CLEAN_ALL=true
            ;;
        --volumes)
            CLEAN_VOLUMES=true
            ;;
    esac
done

echo "[INFO] Analyzing Docker disk usage..."
echo ""
docker system df
echo ""
echo -e "${CYAN}============================================================${NC}"
echo ""

# Step 1: Stop all project containers
echo "[STEP 1/6] Stopping Smart University containers..."
if docker compose down 2>/dev/null; then
    echo "          Containers stopped."
else
    echo "          No compose containers running."
fi
echo ""

# Step 2: Remove stopped containers
echo "[STEP 2/6] Removing stopped containers..."
if docker ps -a -q --filter "status=exited" | grep -q .; then
    docker container prune -f
else
    echo "          No stopped containers to remove."
fi
echo ""

# Step 3: Remove dangling images (or all unused if --all)
if [ "$CLEAN_ALL" = true ]; then
    echo "[STEP 3/6] Removing ALL unused images (--all mode)..."
    docker image prune -a -f
else
    echo "[STEP 3/6] Removing dangling images only..."
    docker image prune -f
fi
echo ""

# Step 4: Remove build cache
echo "[STEP 4/6] Removing Docker build cache..."
docker builder prune -f
echo ""

# Step 5: Remove unused networks
echo "[STEP 5/6] Removing unused networks..."
docker network prune -f
echo ""

# Step 6: Remove unused volumes (only if --volumes flag)
if [ "$CLEAN_VOLUMES" = true ]; then
    echo "[STEP 6/6] Removing unused volumes (--volumes mode)..."
    echo -e "          ${YELLOW}WARNING: This may delete database data!${NC}"
    docker volume prune -f
else
    echo "[STEP 6/6] Skipping volume cleanup (use --volumes to include)"
    echo "          [Volumes preserved to protect database data]"
fi
echo ""

echo -e "${CYAN}============================================================${NC}"
echo ""
echo "[INFO] Cleanup complete! New disk usage:"
echo ""
docker system df
echo ""
echo -e "${CYAN}============================================================${NC}"
echo ""
echo "Tips:"
echo "  - Run './scripts/docker-cleanup.sh --all' for deeper cleanup"
echo "  - Run './scripts/docker-cleanup.sh --volumes' to also remove volumes"
echo "  - Rebuild project with: docker compose up --build"
echo ""
echo -e "${CYAN}============================================================${NC}"
