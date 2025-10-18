#!/bin/bash

################################################################################
# Smoke Test Script for Dental CRM
# Purpose: Verify application health before deployment
# Usage: SMOKE_URL=http://localhost:3000 bash scripts/smoke.sh
################################################################################

set -e

# Configuration
SMOKE_URL="${SMOKE_URL:-http://localhost:${PORT:-3000}}"
HEALTH_ENDPOINT="/api/health"
MAX_RETRIES=12
SLEEP_SECONDS=5

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DENTAL CRM SMOKE TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Target URL: $SMOKE_URL"
echo "Health endpoint: $HEALTH_ENDPOINT"
echo "Max retries: $MAX_RETRIES (every ${SLEEP_SECONDS}s)"
echo ""

for i in $(seq 1 $MAX_RETRIES); do
  echo -e "\033[1;33m[Attempt $i/$MAX_RETRIES]\033[0m Checking ${SMOKE_URL}${HEALTH_ENDPOINT}..."
  
  HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "${SMOKE_URL}${HEALTH_ENDPOINT}" || echo "000")
  
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "\033[0;32m✓ Health check passed (HTTP 200)\033[0m"
    echo ""
    
    # Get detailed health info
    HEALTH_RESPONSE=$(curl -s "${SMOKE_URL}${HEALTH_ENDPOINT}")
    echo "Health Response:"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SMOKE TEST PASSED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  else
    echo -e "\033[0;31m✗ Health check failed (HTTP $HTTP_STATUS)\033[0m"
    if [ $i -lt $MAX_RETRIES ]; then
      echo -e "\033[1;33m⏳ Waiting ${SLEEP_SECONDS}s before retry...\033[0m"
      sleep $SLEEP_SECONDS
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ SMOKE TEST FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The application did not become healthy after $MAX_RETRIES attempts."
echo ""
echo "Troubleshooting tips:"
echo "1. Check if the application is running: ps aux | grep next"
echo "2. Check application logs for errors"
echo "3. Verify PORT is set correctly: echo \$PORT"
echo "4. Try accessing manually: curl ${SMOKE_URL}${HEALTH_ENDPOINT}"
echo "5. Check if the port is in use: lsof -i :${PORT:-3000}"
echo "6. Check Railway logs: railway logs"
echo ""
exit 1

