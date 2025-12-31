#!/bin/bash
# Clean all build artifacts from the Smart University project
# Usage: ./scripts/clean-all.sh

set -e

cd "$(dirname "$0")/.."

echo "==> Cleaning all Maven target directories..."

# Clean root target
if [ -d "target" ]; then
    echo "Cleaning target..."
    rm -rf "target"
fi

# Clean all service targets
for dir in auth-service booking-service common-lib dashboard-service exam-service gateway-service marketplace-service notification-service payment-service; do
    if [ -d "$dir/target" ]; then
        echo "Cleaning $dir/target..."
        rm -rf "$dir/target"
    fi
done

# Clean frontend build
if [ -d "frontend/dist" ]; then
    echo "Cleaning frontend/dist..."
    rm -rf "frontend/dist"
fi

if [ -d "frontend/node_modules" ]; then
    echo "Cleaning frontend/node_modules..."
    rm -rf "frontend/node_modules"
fi

echo "==> Clean complete!"
