#!/bin/bash

# Workflow Status Checker
# Checks the status of all GitHub Actions workflows

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 GitHub Actions Workflow Status Checker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REPO="AgenttoffeeOrg/dental-crm-private"
WORKFLOWS=(
  "SonarCloud Analysis"
  "CodeQL Advanced Security"
  "Demo Reset"
  "Verify Demo Data"
  "Dependabot Auto-Merge"
  "k6 Load Tests"
  "Lighthouse CI"
  "E2E Tests"
  "Percy Visual Tests"
  "Semgrep SAST"
  "SQLFluff"
  "Pre-Deploy Gate"
)

echo "📋 Checking workflow files..."
echo ""

for workflow_file in .github/workflows/*.yml .github/workflows/*.yaml; do
  if [ -f "$workflow_file" ]; then
    workflow_name=$(basename "$workflow_file" .yml | basename .yaml)
    echo "  ✅ $workflow_name"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Workflow Configuration Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if required files exist
echo "Required Files:"
[ -f "playwright.config.ts" ] && echo "  ✅ playwright.config.ts" || echo "  ❌ playwright.config.ts (missing)"
[ -f "jest.config.js" ] && echo "  ✅ jest.config.js" || echo "  ❌ jest.config.js (missing)"
[ -f "lighthouserc.json" ] && echo "  ✅ lighthouserc.json" || echo "  ❌ lighthouserc.json (missing)"
[ -d "k6" ] && echo "  ✅ k6/ directory" || echo "  ❌ k6/ directory (missing)"
[ -d "tests" ] && echo "  ✅ tests/ directory" || echo "  ❌ tests/ directory (missing)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Quick Fixes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To check workflow status in GitHub:"
echo "  https://github.com/$REPO/actions"
echo ""
echo "To manually trigger a workflow:"
echo "  1. Go to Actions tab"
echo "  2. Select the workflow"
echo "  3. Click 'Run workflow'"
echo ""
echo "To check SonarCloud status:"
echo "  https://sonarcloud.io/project/overview?id=$REPO"
echo ""

