#!/bin/bash

# Comprehensive Workflow Status Checker
# Uses GitHub API to get real-time status of all workflows

set -e

REPO="AgenttoffeeOrg/dental-crm-private"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 GitHub Actions Workflow Status Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️  GITHUB_TOKEN not set. Install GitHub CLI and run: gh auth login"
  echo "   Or set GITHUB_TOKEN environment variable"
  echo ""
  echo "📋 Workflow Files Found:"
  ls -1 .github/workflows/*.yml 2>/dev/null | while read file; do
    echo "  ✅ $(basename $file)"
  done
  exit 0
fi

# Get workflow runs
echo "📊 Fetching workflow status..."
echo ""

WORKFLOWS=$(gh api repos/$REPO/actions/workflows --jq '.workflows[] | "\(.id)|\(.name)|\(.path)"')

while IFS='|' read -r id name path; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Get latest run
  RUN=$(gh api repos/$REPO/actions/workflows/$id/runs --jq '.workflow_runs[0]')
  
  if [ "$RUN" != "null" ] && [ -n "$RUN" ]; then
    STATUS=$(echo "$RUN" | jq -r '.status')
    CONCLUSION=$(echo "$RUN" | jq -r '.conclusion // "unknown"')
    CREATED=$(echo "$RUN" | jq -r '.created_at')
    HEAD_BRANCH=$(echo "$RUN" | jq -r '.head_branch')
    HTML_URL=$(echo "$RUN" | jq -r '.html_url')
    
    echo "  Status: $STATUS"
    echo "  Conclusion: $CONCLUSION"
    echo "  Branch: $HEAD_BRANCH"
    echo "  Created: $CREATED"
    echo "  URL: $HTML_URL"
    
    if [ "$STATUS" = "completed" ]; then
      if [ "$CONCLUSION" = "success" ]; then
        echo "  ✅ Last run: SUCCESS"
      elif [ "$CONCLUSION" = "failure" ]; then
        echo "  ❌ Last run: FAILED"
      elif [ "$CONCLUSION" = "cancelled" ]; then
        echo "  ⚠️  Last run: CANCELLED"
      else
        echo "  ⚠️  Last run: $CONCLUSION"
      fi
    else
      echo "  🔄 Currently: $STATUS"
    fi
  else
    echo "  ⚠️  No runs found"
  fi
  
  echo ""
done <<< "$WORKFLOWS"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "View all workflows: https://github.com/$REPO/actions"
echo ""

