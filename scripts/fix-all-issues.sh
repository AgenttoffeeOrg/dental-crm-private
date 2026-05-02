#!/bin/bash

# Script to fix common SonarCloud issues automatically
# This helps fix repetitive patterns across the codebase

echo "🔧 Fixing common SonarCloud issues..."

# Fix await trackEvent (trackEvent returns void)
echo "Fixing await trackEvent issues..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/await trackEvent(/trackEvent(/g' {} +

echo "✅ Done! Review changes before committing."



