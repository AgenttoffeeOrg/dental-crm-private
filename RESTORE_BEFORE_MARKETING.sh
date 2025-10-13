#!/bin/bash

# Restore to BEFORE Marketing Integration
# Returns to Version 3 - Clean UI Enterprise

set -e

echo "============================================"
echo "  RESTORE: BEFORE MARKETING INTEGRATION"
echo "============================================"
echo ""
echo "This will restore to Version 3 (before Marketing integration):"
echo "  • Clean CRM with no Marketing"
echo "  • All features working"
echo "  • Tag: v3-clean-ui-enterprise"
echo ""
echo "⚠️  WARNING: This will discard Marketing integration work!"
echo ""

read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🔄 Returning to main branch..."
git checkout main

echo "🔄 Resetting to Version 3..."
git reset --hard v3-clean-ui-enterprise

echo ""
echo "✅ Restored to before Marketing integration!"
echo ""
echo "Current state:"
echo "  • CRM fully functional"
echo "  • No Marketing module"
echo "  • Clean baseline"
echo ""
echo "Run: npm run dev"
echo ""


