#!/bin/bash
# Convenience script to start the full Smart University stack via docker-compose.
# This version relies on Docker multi-stage builds to run Maven inside containers,
# so Maven is NOT required on the host.
#
# Usage:
#   ./scripts/start-platform.sh          - docker compose up --build
#   ./scripts/start-platform.sh -d       - docker compose up -d --build (detached)

set -e

# Change to project root directory
cd "$(dirname "$0")/.."

echo ""
echo "==> Checking required tools..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed or not in PATH."
    exit 1
fi

# Check for Docker Compose (V2 or V1)
COMPOSE_CMD=""

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Docker Compose is required but not installed."
    echo "Please install Docker Compose V2 (docker compose) or V1 (docker-compose)."
    exit 1
fi

echo ""
echo "==> Starting full stack with $COMPOSE_CMD (builds images as needed)..."

if [ "$1" = "-d" ]; then
    $COMPOSE_CMD up --build -d
    echo ""
    echo "==> Services started in detached mode."
    echo "    View logs with: $COMPOSE_CMD logs -f"
    echo "    Stop with: $COMPOSE_CMD down"
else
    $COMPOSE_CMD up --build
fi
