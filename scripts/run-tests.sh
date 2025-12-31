#!/bin/bash
# Run the backend test suite using Docker images only.
# This does NOT require Maven to be installed on the host.
#
# Usage:
#   ./scripts/run-tests.sh              - Run backend tests only
#   ./scripts/run-tests.sh --frontend   - Run frontend tests only
#   ./scripts/run-tests.sh --all        - Run both backend and frontend tests

set -e

cd "$(dirname "$0")/.."

echo "==> Checking required tools..."

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed or not in PATH."
    exit 1
fi

RUN_BACKEND=false
RUN_FRONTEND=false

case "${1:-}" in
    --frontend)
        RUN_FRONTEND=true
        ;;
    --all)
        RUN_BACKEND=true
        RUN_FRONTEND=true
        ;;
    *)
        RUN_BACKEND=true
        ;;
esac

if [ "$RUN_BACKEND" = true ]; then
    echo ""
    echo "==> Running backend tests (Maven) inside Docker..."
    
    docker run --rm -v "$(pwd)":/workspace -w /workspace maven:3.9-eclipse-temurin-17 mvn clean verify
    
    if [ $? -ne 0 ]; then
        echo "Error: Backend tests failed."
        exit 1
    fi
    
    echo "==> Backend tests completed successfully."
    
    echo ""
    echo "==> Cleaning up generated test artifacts..."
    
    # Remove Maven target directories
    for dir in auth-service booking-service dashboard-service exam-service gateway-service marketplace-service notification-service payment-service common-lib; do
        if [ -d "$dir/target" ]; then
            echo "Removing $dir/target..."
            rm -rf "$dir/target"
        fi
    done
    
    if [ -d "target" ]; then
        echo "Removing root target..."
        rm -rf "target"
    fi
    
    echo "==> Cleanup complete."
fi

if [ "$RUN_FRONTEND" = true ]; then
    echo ""
    echo "==> Running frontend tests inside Docker..."
    
    docker run --rm -v "$(pwd)/frontend":/app -w /app node:20-alpine sh -c "npm ci && npm test -- --watchAll=false"
    
    if [ $? -ne 0 ]; then
        echo "Error: Frontend tests failed."
        exit 1
    fi
    
    echo "==> Frontend tests completed successfully."
fi

echo ""
echo "==> All tests finished."
