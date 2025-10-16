#!/bin/bash

# ============================================
# RESTORE TO VERSION 9 CHECKPOINT
# ============================================
# This script restores the codebase to the
# Version 9 checkpoint (Multi-Tenant Security + Architecture)
#
# Date: October 16, 2025
# Tag: v9.0-security-architecture
# ============================================

set -e  # Exit on any error

echo "🔄 Restoring to Version 9 Checkpoint..."
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Confirm with user
echo "⚠️  WARNING: This will discard any uncommitted changes!"
echo ""
read -p "Are you sure you want to restore to Version 9? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo ""
echo "📥 Fetching latest tags..."
git fetch --tags

echo "🔍 Checking if tag exists..."
if ! git rev-parse v9.0-security-architecture >/dev/null 2>&1; then
  echo "❌ Error: Tag 'v9.0-security-architecture' not found"
  echo ""
  echo "Available tags:"
  git tag -l
  exit 1
fi

echo "💾 Creating backup branch (current state)..."
BACKUP_BRANCH="backup-before-v9-restore-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH" 2>/dev/null || true
echo "✅ Backup created: $BACKUP_BRANCH"

echo "🔄 Checking out Version 9..."
git checkout v9.0-security-architecture

echo ""
echo "✅ Successfully restored to Version 9!"
echo ""
echo "📋 Next steps:"
echo "   1. Read: VERSION_9_CHECKPOINT_SECURITY_ARCHITECTURE.md"
echo "   2. Check which SQL migrations need to be run"
echo "   3. Run: npm install (if dependencies changed)"
echo "   4. Run: npm run dev"
echo ""
echo "💡 To return to latest:"
echo "   git checkout main"
echo ""
echo "💾 Your previous state was saved to branch: $BACKUP_BRANCH"
echo ""

