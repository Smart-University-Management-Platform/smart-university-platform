#!/bin/bash
# Smart University Health Check Script for Linux/macOS
# Verifies all services are running and healthy
#
# Usage: ./scripts/check-health.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  Smart University Health Check${NC}"
echo -e "${CYAN}===========================================${NC}"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}[ERROR] curl is not installed.${NC}"
    exit 1
fi

HEALTHY_COUNT=0
TOTAL_COUNT=9  # 2 exposed + 7 docker services

echo ""
echo -e "${YELLOW}📡 Checking Exposed Services...${NC}"

# Check Gateway
printf "   %-25s" "Gateway"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health --max-time 5 | grep -q "200"; then
    echo -e "${GREEN}✅ UP${NC}"
    ((HEALTHY_COUNT++))
else
    echo -e "${RED}❌ DOWN${NC}"
fi

# Check Frontend
printf "   %-25s" "Frontend"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/ --max-time 5 | grep -q "200"; then
    echo -e "${GREEN}✅ UP${NC}"
    ((HEALTHY_COUNT++))
else
    echo -e "${RED}❌ DOWN${NC}"
fi

echo ""
echo -e "${YELLOW}🐳 Checking Docker Services...${NC}"

DOCKER_SERVICES=(
    "auth-service:Auth Service"
    "booking-service:Booking Service"
    "marketplace-service:Marketplace Service"
    "payment-service:Payment Service"
    "exam-service:Exam Service"
    "notification-service:Notification Service"
    "dashboard-service:Dashboard Service"
)

for service in "${DOCKER_SERVICES[@]}"; do
    container=$(echo "$service" | cut -d: -f1)
    name=$(echo "$service" | cut -d: -f2)
    printf "   %-25s" "$name"
    
    status=$(docker inspect --format "{{.State.Status}}" "$container" 2>/dev/null || echo "not found")
    
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✅ Running${NC}"
        ((HEALTHY_COUNT++))
    elif [ "$status" = "not found" ]; then
        echo -e "${RED}❌ Not found${NC}"
    else
        echo -e "${YELLOW}⚠️  $status${NC}"
    fi
done

echo ""
echo -e "${YELLOW}🔧 Checking Infrastructure...${NC}"

# Check RabbitMQ
printf "   %-25s" "RabbitMQ"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:15800/ --max-time 5 | grep -q "200"; then
    echo -e "${GREEN}✅ UP (Web UI available)${NC}"
else
    echo -e "${RED}❌ DOWN${NC}"
fi

# Check Redis
printf "   %-25s" "Redis"
redis_ping=$(docker exec redis redis-cli -a changeme ping 2>/dev/null || echo "")
if [ "$redis_ping" = "PONG" ]; then
    echo -e "${GREEN}✅ UP (PONG received)${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot check${NC}"
fi

echo ""
echo -e "${YELLOW}🗄️  Checking Databases...${NC}"

DATABASES=("auth-db" "booking-db" "market-db" "payment-db" "exam-db" "notification-db" "dashboard-db")

for db in "${DATABASES[@]}"; do
    printf "   %-25s" "$db"
    status=$(docker inspect --format "{{.State.Status}}" "$db" 2>/dev/null || echo "not found")
    
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✅ Running${NC}"
    elif [ "$status" = "not found" ]; then
        echo -e "${RED}❌ Not found${NC}"
    else
        echo -e "${YELLOW}⚠️  $status${NC}"
    fi
done

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  Health Check Summary${NC}"
echo -e "${CYAN}===========================================${NC}"

PERCENTAGE=$((HEALTHY_COUNT * 100 / TOTAL_COUNT))

if [ "$PERCENTAGE" -eq 100 ]; then
    COLOR=$GREEN
elif [ "$PERCENTAGE" -ge 80 ]; then
    COLOR=$YELLOW
else
    COLOR=$RED
fi

echo ""
echo -e "   Services Healthy: ${COLOR}$HEALTHY_COUNT / $TOTAL_COUNT ($PERCENTAGE%)${NC}"

if [ "$HEALTHY_COUNT" -eq "$TOTAL_COUNT" ]; then
    echo ""
    echo -e "   ${GREEN}🎉 All systems operational! Ready to test.${NC}"
    echo -e "   ${CYAN}🌐 Open: http://localhost:3200${NC}"
else
    echo ""
    echo -e "   ${YELLOW}⚠️  Some services are down. Run:${NC}"
    echo "      docker compose logs -f [service-name]"
fi
echo ""
