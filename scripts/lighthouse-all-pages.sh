#!/bin/bash

###############################################################################
# Lighthouse All Pages Script
#
# Phase 4: Run Lighthouse on all major pages.
# Target: 90+ on Performance, Accessibility, Best Practices, SEO
###############################################################################

set -e

echo "🔦 RUNNING LIGHTHOUSE AUDITS"
echo "============================"
echo ""

# Base URL
BASE_URL="${1:-http://localhost:3000}"
echo "Base URL: $BASE_URL"
echo ""

# Create results directory
mkdir -p lighthouse-results

# Pages to audit
PAGES=(
  "/"
  "/dashboard"
  "/marketing-audit"
  "/contacts"
  "/deals"
  "/tasks"
)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

###############################################################################
# Run Lighthouse on each page
###############################################################################
for PAGE in "${PAGES[@]}"; do
  URL="${BASE_URL}${PAGE}"
  SAFE_NAME=$(echo "$PAGE" | sed 's/\//-/g' | sed 's/^-/root/')
  OUTPUT_FILE="lighthouse-results/${SAFE_NAME}.json"
  
  echo "🔍 Auditing: $URL"
  
  if npx lighthouse "$URL" \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=json \
    --output-path="$OUTPUT_FILE" \
    --chrome-flags="--headless" \
    --quiet; then
    
    # Extract scores
    PERF=$(cat "$OUTPUT_FILE" | jq '.categories.performance.score * 100' | cut -d'.' -f1)
    A11Y=$(cat "$OUTPUT_FILE" | jq '.categories.accessibility.score * 100' | cut -d'.' -f1)
    BP=$(cat "$OUTPUT_FILE" | jq '.categories["best-practices"].score * 100' | cut -d'.' -f1)
    SEO=$(cat "$OUTPUT_FILE" | jq '.categories.seo.score * 100' | cut -d'.' -f1)
    
    echo "  Performance:    $PERF"
    echo "  Accessibility:  $A11Y"
    echo "  Best Practices: $BP"
    echo "  SEO:            $SEO"
    
    # Check if all scores >= 90
    if [ "$PERF" -ge 90 ] && [ "$A11Y" -ge 90 ] && [ "$BP" -ge 90 ] && [ "$SEO" -ge 90 ]; then
      echo -e "  ${GREEN}✅ PASSED${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "  ${YELLOW}⚠️  Some scores below 90${NC}"
      FAILED=$((FAILED + 1))
    fi
  else
    echo -e "  ${RED}❌ Lighthouse failed${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
done

###############################################################################
# Summary
###############################################################################
echo "================================"
echo "LIGHTHOUSE SUMMARY"
echo "================================"
echo "Passed: $PASSED/${#PAGES[@]}"
echo "Failed: $FAILED/${#PAGES[@]}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL PAGES MEET 90+ TARGET!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some pages need optimization${NC}"
  echo "Check lighthouse-results/ for details"
  exit 1
fi

