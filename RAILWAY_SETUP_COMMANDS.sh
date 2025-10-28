#!/bin/bash

# =====================================================
# Railway Deployment Setup Commands
# =====================================================
# Project: spirited-growth
# Status: ✅ Linked successfully!
# =====================================================

echo "🚀 Setting up Railway environment variables..."

# =====================================================
# STEP 1: Set Environment Variables
# =====================================================
# Replace these values with your actual Supabase credentials
# Get them from: https://supabase.com/dashboard → Settings → API

echo "📝 Setting NEXT_PUBLIC_SUPABASE_URL..."
railway variables set NEXT_PUBLIC_SUPABASE_URL='https://your-project-id.supabase.co'

echo "📝 Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..."
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key-here'

echo "📝 Setting SUPABASE_SERVICE_ROLE_KEY..."
railway variables set SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'

echo "📝 Setting NODE_ENV..."
railway variables set NODE_ENV='production'

echo ""
echo "=========================================="
echo "✅ Environment variables set!"
echo "=========================================="
echo ""

# =====================================================
# STEP 2: Deploy to Railway
# =====================================================
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "=========================================="
echo "🎉 Deployment initiated!"
echo "=========================================="
echo ""
echo "📊 Monitor your deployment:"
echo "   railway logs"
echo ""
echo "🌐 Get your deployment URL:"
echo "   railway domain"
echo ""
echo "🔍 Check deployment status:"
echo "   railway status"
echo ""
echo "=========================================="

