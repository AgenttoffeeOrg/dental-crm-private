#!/bin/bash

# SonarCloud Analysis Script
# Run this script to analyze your codebase with SonarCloud

set -e

echo "🔍 Starting SonarCloud Analysis..."
echo ""

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
  echo "❌ Error: SONAR_TOKEN environment variable is not set"
  echo ""
  echo "To set it:"
  echo "  export SONAR_TOKEN=your_token_here"
  echo ""
  echo "Or add it to .env.local:"
  echo "  echo 'SONAR_TOKEN=your_token_here' >> .env.local"
  echo ""
  echo "Get your token from: https://sonarcloud.io → My Account → Security"
  exit 1
fi

# Check if sonar-scanner is installed
if ! command -v sonar-scanner &> /dev/null; then
  echo "❌ Error: sonar-scanner is not installed"
  echo ""
  echo "Install it with:"
  echo "  npm install -g sonarqube-scanner"
  echo "  # or"
  echo "  brew install sonar-scanner"
  exit 1
fi

# Load .env.local if it exists
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "✅ SonarScanner found"
echo "✅ Token configured"
echo ""
echo "Running analysis..."
echo ""

# Run SonarScanner (try npx first, then global)
if command -v sonar-scanner &> /dev/null; then
  sonar-scanner
elif command -v npx &> /dev/null; then
  npx sonarqube-scanner
else
  echo "❌ Error: Neither sonar-scanner nor npx found"
  exit 1
fi

echo ""
echo "✅ Analysis complete!"
echo ""
echo "View results at: https://sonarcloud.io/project/overview?id=AgenttoffeeOrg_dental-crm-private"

