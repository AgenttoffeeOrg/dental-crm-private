#!/bin/bash

# Restore to Version 4 - Marketing Integrated
# Returns to fully integrated Marketing + CRM state

set -e

echo "============================================"
echo "  RESTORE: VERSION 4 (Marketing Integrated)"
echo "============================================"
echo ""
echo "This will restore to Version 4:"
echo "  • Full CRM + Marketing integration"
echo "  • All 225 integration tasks complete"
echo "  • Marketing DISABLED by default (safe)"
echo "  • Tag: v4-marketing-integrated"
echo ""

read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🔄 Checking out marketing-integration-safe branch..."
git checkout marketing-integration-safe

echo "🔄 Resetting to Version 4 tag..."
git reset --hard v4-marketing-integrated

echo ""
echo "✅ Restored to Version 4 (Marketing Integrated)!"
echo ""
echo "Current state:"
echo "  • CRM fully functional"
echo "  • Marketing infrastructure complete"
echo "  • Marketing DISABLED by default"
echo "  • Run database migration to activate"
echo ""
echo "Next steps:"
echo "  1. Run: supabase/sql/25_marketing_crm_integration.sql"
echo "  2. Enable Marketing when ready"
echo "  3. Test CRM (should work identically)"
echo ""
echo "Run: npm run dev"
echo ""

