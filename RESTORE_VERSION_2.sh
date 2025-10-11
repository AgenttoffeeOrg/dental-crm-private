#!/bin/bash

# Script to restore Version 2 of the dental-crm application
# This will reset your code to the stable Version 2 checkpoint

echo "🔄 Restoring Version 2: HubSpot-style Pipeline System"
echo ""
echo "This will:"
echo "  - Reset all code to Version 2 stable state"
echo "  - Discard any changes made after Version 2"
echo "  - Restore working HubSpot-style interface"
echo ""
read -p "Are you sure you want to restore Version 2? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo ""
echo "📦 Restoring Version 2..."
echo ""

# Reset to Version 2 tag
git reset --hard v2-hubspot-pipelines

echo ""
echo "✅ Version 2 Restored Successfully!"
echo ""
echo "📋 Version 2 Features:"
echo "  ✅ HubSpot-style pipeline interface"
echo "  ✅ 6 pre-configured templates"
echo "  ✅ Board & List views"
echo "  ✅ Complete patient linking"
echo "  ✅ All buttons working"
echo "  ✅ Clean deal creation form"
echo "  ✅ Duplicate prevention"
echo ""
echo "🚀 Your app is now at Version 2 stable state"
echo ""
echo "Run: npm run dev"
echo "Open: http://localhost:3001/pipeline"
echo ""

