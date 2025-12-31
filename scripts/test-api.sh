#!/bin/bash
# Smart University API Test Script for Linux/macOS
# Run after: docker compose up -d
#
# Usage: ./scripts/test-api.sh
#
# Requirements: curl, jq

set -e

BASE_URL="http://localhost:8080"
TENANT="engineering"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON parsing will be limited.${NC}"
    HAS_JQ=false
else
    HAS_JQ=true
fi

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  Smart University API Test Suite${NC}"
echo -e "${CYAN}===========================================${NC}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for API calls
invoke_api() {
    local method="$1"
    local endpoint="$2"
    local body="$3"
    local description="$4"
    local auth_token="$5"
    
    echo -e "${YELLOW}[$method] $endpoint${NC}"
    echo -e "${GRAY}Description: $description${NC}"
    
    local headers="-H 'Content-Type: application/json'"
    if [ -n "$auth_token" ]; then
        headers="$headers -H 'Authorization: Bearer $auth_token' -H 'X-Tenant-Id: $TENANT'"
    fi
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method '$BASE_URL$endpoint' $headers"
    
    if [ -n "$body" ]; then
        curl_cmd="$curl_cmd -d '$body'"
    fi
    
    local response
    response=$(eval "$curl_cmd" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n 1)
    local response_body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ SUCCESS ($http_code)${NC}"
        ((TESTS_PASSED++))
        echo "$response_body"
        return 0
    else
        echo -e "${RED}❌ FAILED ($http_code)${NC}"
        ((TESTS_FAILED++))
        echo ""
        return 1
    fi
}

# Extract array from paginated response
extract_array() {
    local response="$1"
    if [ "$HAS_JQ" = true ]; then
        # Check if response has 'content' field (paginated)
        if echo "$response" | jq -e '.content' &> /dev/null; then
            echo "$response" | jq '.content'
        else
            echo "$response"
        fi
    else
        echo "$response"
    fi
}

# Generate unique username
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEST_USER="testuser_$TIMESTAMP"
TEST_PASS="TestPass123!"

echo ""
echo -e "${MAGENTA}=== 1. AUTHENTICATION TESTS ===${NC}"

# Register a new user
REGISTER_BODY="{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"tenantId\":\"$TENANT\"}"
REGISTER_RESULT=$(invoke_api "POST" "/auth/register" "$REGISTER_BODY" "Register new student user" "")

# Login
LOGIN_BODY="{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"tenantId\":\"$TENANT\"}"
LOGIN_RESULT=$(invoke_api "POST" "/auth/login" "$LOGIN_BODY" "Login to get JWT token" "")

if [ -z "$LOGIN_RESULT" ]; then
    echo -e "\n${RED}❌ Cannot proceed without authentication token. Exiting.${NC}"
    exit 1
fi

# Extract token
if [ "$HAS_JQ" = true ]; then
    TOKEN=$(echo "$LOGIN_RESULT" | jq -r '.token // empty')
else
    TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo -e "\n${RED}❌ Failed to extract token. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JWT Token obtained successfully${NC}"

echo ""
echo -e "${MAGENTA}=== 2. DASHBOARD TESTS ===${NC}"

# Get sensors
SENSORS_RESULT=$(invoke_api "GET" "/dashboard/sensors" "" "Get IoT sensor readings" "$TOKEN")
if [ "$HAS_JQ" = true ] && [ -n "$SENSORS_RESULT" ]; then
    SENSOR_COUNT=$(echo "$SENSORS_RESULT" | jq 'if type == "array" then length else 0 end')
    echo -e "   ${CYAN}Found $SENSOR_COUNT sensors${NC}"
fi

# Get shuttles
SHUTTLES_RESULT=$(invoke_api "GET" "/dashboard/shuttles" "" "Get shuttle locations" "$TOKEN")
if [ "$HAS_JQ" = true ] && [ -n "$SHUTTLES_RESULT" ]; then
    SHUTTLE_COUNT=$(echo "$SHUTTLES_RESULT" | jq 'if type == "array" then length else 0 end')
    echo -e "   ${CYAN}Found $SHUTTLE_COUNT shuttles${NC}"
fi

echo ""
echo -e "${MAGENTA}=== 3. BOOKING TESTS ===${NC}"

# List resources
RESOURCES_RESULT=$(invoke_api "GET" "/booking/resources" "" "List available resources" "$TOKEN")
RESOURCES=$(extract_array "$RESOURCES_RESULT")

if [ "$HAS_JQ" = true ] && [ -n "$RESOURCES_RESULT" ]; then
    RESOURCE_COUNT=$(echo "$RESOURCES" | jq 'if type == "array" then length else 0 end')
    echo -e "   ${CYAN}Found $RESOURCE_COUNT resources${NC}"
    
    # Create a reservation if resources exist
    if [ "$RESOURCE_COUNT" -gt 0 ]; then
        RESOURCE_ID=$(echo "$RESOURCES" | jq -r '.[0].id')
        RANDOM_OFFSET=$((RANDOM % 144 + 24))
        START_TIME=$(date -u -d "+$RANDOM_OFFSET hours" +%Y-%m-%dT%H:00:00Z 2>/dev/null || date -u -v+${RANDOM_OFFSET}H +%Y-%m-%dT%H:00:00Z)
        END_TIME=$(date -u -d "+$((RANDOM_OFFSET + 1)) hours" +%Y-%m-%dT%H:00:00Z 2>/dev/null || date -u -v+$((RANDOM_OFFSET + 1))H +%Y-%m-%dT%H:00:00Z)
        
        RESERVATION_BODY="{\"resourceId\":\"$RESOURCE_ID\",\"startTime\":\"$START_TIME\",\"endTime\":\"$END_TIME\"}"
        invoke_api "POST" "/booking/reservations" "$RESERVATION_BODY" "Create a new reservation" "$TOKEN"
    fi
fi

echo ""
echo -e "${MAGENTA}=== 4. MARKETPLACE TESTS ===${NC}"

# List products (paginated)
PRODUCTS_RESULT=$(invoke_api "GET" "/market/products" "" "List available products (cached, paginated)" "$TOKEN")
PRODUCTS=$(extract_array "$PRODUCTS_RESULT")

if [ "$HAS_JQ" = true ] && [ -n "$PRODUCTS_RESULT" ]; then
    PRODUCT_COUNT=$(echo "$PRODUCTS" | jq 'if type == "array" then length else 0 end')
    echo -e "   ${CYAN}Found $PRODUCT_COUNT products${NC}"
    
    # Buy a product if products exist
    if [ "$PRODUCT_COUNT" -gt 0 ]; then
        PRODUCT_ID=$(echo "$PRODUCTS" | jq -r '.[0].id')
        ORDER_BODY="{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}]}"
        invoke_api "POST" "/market/orders/checkout" "$ORDER_BODY" "Checkout order (Saga pattern)" "$TOKEN"
    fi
fi

# Get order history
invoke_api "GET" "/market/orders/mine" "" "Get user's order history" "$TOKEN"

echo ""
echo -e "${MAGENTA}=== 5. EXAM TESTS ===${NC}"

# List exams
EXAMS_RESULT=$(invoke_api "GET" "/exam/exams" "" "List existing exams" "$TOKEN")

if [ "$HAS_JQ" = true ] && [ -n "$EXAMS_RESULT" ]; then
    EXAMS=$(extract_array "$EXAMS_RESULT")
    EXAM_COUNT=$(echo "$EXAMS" | jq 'if type == "array" then length else 0 end')
    echo -e "   ${CYAN}Found $EXAM_COUNT exams${NC}"
    
    # Get exam details if exams exist
    if [ "$EXAM_COUNT" -gt 0 ]; then
        EXAM_ID=$(echo "$EXAMS" | jq -r '.[0].id')
        invoke_api "GET" "/exam/exams/$EXAM_ID" "" "Get exam details" "$TOKEN"
    fi
fi

echo ""
echo -e "${MAGENTA}=== 6. ADMIN TESTS (Expected to fail for STUDENT) ===${NC}"

echo -e "${YELLOW}[GET] /auth/admin/users${NC}"
echo -e "${GRAY}Description: List all users (ADMIN only - expected 403 for STUDENT)${NC}"

ADMIN_RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "$BASE_URL/auth/admin/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Tenant-Id: $TENANT" 2>/dev/null)
ADMIN_HTTP_CODE=$(echo "$ADMIN_RESPONSE" | tail -n 1)

if [ "$ADMIN_HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✅ CORRECTLY DENIED (403 Forbidden)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ UNEXPECTED: $ADMIN_HTTP_CODE${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}  Test Suite Complete!${NC}"
echo -e "${CYAN}===========================================${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ "$TOTAL_TESTS" -gt 0 ]; then
    PERCENTAGE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
else
    PERCENTAGE=0
fi

if [ "$PERCENTAGE" -eq 100 ]; then
    COLOR=$GREEN
elif [ "$PERCENTAGE" -ge 80 ]; then
    COLOR=$YELLOW
else
    COLOR=$RED
fi

echo ""
echo -e "📊 Results: ${COLOR}$TESTS_PASSED passed, $TESTS_FAILED failed ($PERCENTAGE%)${NC}"

echo ""
echo -e "📋 Summary:"
echo -e "   ${GREEN}• Authentication: JWT registration and login${NC}"
echo -e "   ${GREEN}• Dashboard: Sensors and shuttles (IoT simulation)${NC}"
echo -e "   ${GREEN}• Booking: Resources and reservations${NC}"
echo -e "   ${GREEN}• Marketplace: Products, Saga checkout, order history${NC}"
echo -e "   ${GREEN}• Exam: Exam listing and details${NC}"
echo -e "   ${GREEN}• RBAC: Admin endpoints correctly protected${NC}"

echo ""
echo -e "${YELLOW}🔗 Test in browser: http://localhost:3200${NC}"
echo -e "${YELLOW}   User: $TEST_USER | Pass: $TEST_PASS | Tenant: $TENANT${NC}"
echo ""
