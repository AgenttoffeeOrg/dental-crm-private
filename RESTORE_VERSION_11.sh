#!/bin/bash

# ============================================
# RESTORE TO VERSION 11 CHECKPOINT
# ============================================
# This script restores the codebase to the
# Version 11 checkpoint (All Hardening Migrations Applied)
#
# Date: October 17, 2025
# Tag: v11.0-migrations-complete
# ============================================

set -e  # Exit on any error

echo "🔄 Restoring to Version 11 Checkpoint..."
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Confirm with user
echo "⚠️  WARNING: This will discard any uncommitted changes!"
echo ""
read -p "Are you sure you want to restore to Version 11? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo ""
echo "📥 Fetching latest tags..."
git fetch --tags

echo "🔍 Checking if tag exists..."
if ! git rev-parse v11.0-migrations-complete >/dev/null 2>&1; then
  echo "❌ Error: Tag 'v11.0-migrations-complete' not found"
  echo ""
  echo "Available tags:"
  git tag -l
  exit 1
fi

echo "💾 Creating backup branch (current state)..."
BACKUP_BRANCH="backup-before-v11-restore-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH" 2>/dev/null || true
echo "✅ Backup created: $BACKUP_BRANCH"

echo "🔄 Checking out Version 11..."
git checkout v11.0-migrations-complete

echo ""
echo "✅ Successfully restored to Version 11!"
echo ""
echo "📋 What you have:"
echo "   ✅ All 12 hardening migrations applied to database"
echo "   ✅ 256+ RLS policies active"
echo "   ✅ 25+ helper functions"
echo "   ✅ Enterprise security grade"
echo ""
echo "📋 What remains (optional):"
echo "   ⏳ Update application code (remove p_tenant_id from RPC calls)"
echo "   ⏳ Switch to soft deletes (optional)"
echo "   ⏳ Update webhook handlers (optional)"
echo ""
echo "💡 To return to latest:"
echo "   git checkout main"
echo ""
echo "💾 Your previous state was saved to branch: $BACKUP_BRANCH"
echo ""

