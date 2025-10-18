#!/usr/bin/env bash

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SMOKE_URL="${SMOKE_URL:-http://localhost:${PORT:-3000}}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
MAX_RETRIES=12
RETRY_DELAY=5

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Starting Smoke Test${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target URL: $SMOKE_URL"
echo "Health endpoint: $HEALTH_PATH"
echo "Max retries: $MAX_RETRIES (every ${RETRY_DELAY}s)"
echo ""

# Function to check health endpoint
check_health() {
  local url="$1"
  local retry=0
  
  while [ $retry -lt $MAX_RETRIES ]; do
    retry=$((retry + 1))
    
    echo -e "${YELLOW}[Attempt $retry/$MAX_RETRIES]${NC} Checking $url$HEALTH_PATH..."
    
    # Try to curl the health endpoint
    response=$(curl -s -w "\n%{http_code}" -o - "$url$HEALTH_PATH" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
      echo -e "${GREEN}✓ Health check passed!${NC}"
      echo ""
      echo "Response body:"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
      echo ""
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${GREEN}✅ Smoke test PASSED${NC}"
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      return 0
    else
      echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
      
      if [ $retry -lt $MAX_RETRIES ]; then
        echo -e "${YELLOW}⏳ Waiting ${RETRY_DELAY}s before retry...${NC}"
        sleep $RETRY_DELAY
      fi
    fi
  done
  
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ Smoke test FAILED${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "The application did not become healthy after $MAX_RETRIES attempts."
  echo ""
  echo "Troubleshooting tips:"
  echo "1. Check if the application is running: ps aux | grep next"
  echo "2. Check application logs for errors"
  echo "3. Verify PORT is set correctly: echo \$PORT"
  echo "4. Try accessing manually: curl $url$HEALTH_PATH"
  echo "5. Check if the port is in use: lsof -i :${PORT:-3000}"
  echo ""
  return 1
}

# Run the health check
check_health "$SMOKE_URL"
exit_code=$?

exit $exit_code

