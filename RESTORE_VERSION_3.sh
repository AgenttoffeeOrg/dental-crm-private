#!/bin/bash

# Restore to Version 3 - Pre User Management
# This script restores your project to the state before user management features were added

echo "🔄 Restoring to Version 3 - Pre User Management..."
echo ""
echo "⚠️  WARNING: This will discard all changes made after Version 3"
echo "Are you sure you want to continue? (yes/no)"
read -r response

if [ "$response" != "yes" ]; then
    echo "❌ Restoration cancelled"
    exit 1
fi

echo ""
echo "📸 Creating backup of current state..."
git add -A
git stash save "Backup before Version 3 restoration - $(date)"

echo ""
echo "⏮️  Restoring to Version 3..."
git reset --hard v3-pre-user-management

echo ""
echo "✅ Successfully restored to Version 3!"
echo ""
echo "What was Version 3:"
echo "  ✅ Edit buttons everywhere"
echo "  ✅ Comprehensive pipeline settings"
echo "  ✅ Multi-channel conversation analysis"
echo "  ✅ Deal health scoring"
echo "  ✅ Smart categorization"
echo "  ✅ Interactive clickable UI"
echo ""
echo "💾 Your previous work is saved in git stash"
echo "To recover it: git stash pop"

