#!/bin/bash

# Restore Version 3: Enterprise UI Polish
# This script will restore your codebase to Version 3 state

set -e  # Exit on error

echo "============================================"
echo "  RESTORE VERSION 3: ENTERPRISE UI POLISH"
echo "============================================"
echo ""
echo "This will restore your codebase to Version 3:"
echo "  • Clean Contacts list design"
echo "  • 2-row Pipeline header"
echo "  • Compact deal cards"
echo "  • Prominent Deal Intelligence"
echo ""
echo "⚠️  WARNING: This will discard any uncommitted changes!"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "📦 Restoring Version 3..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in dental-crm directory!"
    echo "Please run this script from: /Users/deepak/auth-app/dental-crm"
    exit 1
fi

# Check if tag exists
if ! git rev-parse v3-clean-ui-enterprise >/dev/null 2>&1; then
    echo "❌ Error: Tag 'v3-clean-ui-enterprise' not found!"
    echo "The Version 3 checkpoint may not have been created yet."
    exit 1
fi

# Stash any uncommitted changes (just in case)
echo "💾 Stashing any uncommitted changes..."
git stash push -m "Pre-restore-v3-stash-$(date +%Y%m%d-%H%M%S)"

# Reset to Version 3 tag
echo "🔄 Resetting to Version 3 tag..."
git reset --hard v3-clean-ui-enterprise

# Clean untracked files
echo "🧹 Cleaning untracked files..."
git clean -fd

echo ""
echo "✅ Version 3 restored successfully!"
echo ""
echo "📋 What's in this version:"
echo "  ✓ Clean Contacts list (11-column layout)"
echo "  ✓ 2-row Pipeline header (organized)"
echo "  ✓ Compact deal cards (~150px height)"
echo "  ✓ Centered Deal Intelligence card"
echo "  ✓ Professional spacing & typography"
echo "  ✓ No clutter, enterprise-grade design"
echo ""
echo "🔗 Next steps:"
echo "  1. Run: npm install (if needed)"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo ""
echo "📖 For details, see: VERSION_3_SNAPSHOT.md"
echo ""
echo "============================================"
