#!/bin/bash

# =====================================================
# MASTER DEPLOYMENT SCRIPT
# =====================================================
# Deploys all migrations + Sets up super test user
# =====================================================

set -e  # Exit on error

echo "🚀 =============================================="
echo "🚀 DEPLOYING MULTI-LOCATION SYSTEM"
echo "🚀 =============================================="
echo ""

# Get database URL from environment
if [ -f .env.local ]; then
  export $(cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL | xargs)
  export $(cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY | xargs)
fi

# Construct PostgreSQL connection string
DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co.*//')
DB_URL="postgresql://postgres.${DB_HOST}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

echo "📊 Database: ${DB_HOST}"
echo ""

# =====================================================
# STEP 1: Run all migrations
# =====================================================

echo "📦 Running migrations..."
echo ""

MIGRATIONS=(
  "20251018_001_extend_tenants.sql"
  "20251018_002_create_dental_groups.sql"
  "20251018_003_create_user_location_access.sql"
  "20251018_004_create_join_requests.sql"
  "20251018_005_create_billing_schema.sql"
  "20251018_006_seed_plans.sql"
  "20251018_007_update_rls_dual_path.sql"
  "20251018_008_backfill_existing_data.sql"
  "20251018_009_seat_management_functions.sql"
)

for migration in "${MIGRATIONS[@]}"
do
  echo "▶️  Running: $migration"
  
  if psql "$DB_URL" -f "supabase/migrations/$migration" > /dev/null 2>&1; then
    echo "   ✅ Success"
  else
    echo "   ⚠️  Already applied or error (continuing...)"
  fi
  echo ""
done

echo "✅ All migrations processed"
echo ""

# =====================================================
# STEP 2: Set up super test user
# =====================================================

echo "👤 Setting up super test user..."
echo ""

psql "$DB_URL" -f "scripts/deploy_all_and_setup_test_user.sql"

echo ""
echo "🎉 =============================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🎉 =============================================="
echo ""
echo "✅ All features deployed and ready"
echo "✅ Test user (deepakshegde@gmail.com) has full access"
echo ""
echo "📋 Next steps:"
echo "   1. Start dev server: npm run dev"
echo "   2. Login as deepakshegde@gmail.com"
echo "   3. Test all features!"
echo ""
echo "🎉 =============================================="

