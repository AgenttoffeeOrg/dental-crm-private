#!/usr/bin/env bash

# 🚀 Railway Deployment Script for Dental CRM
# This script helps you deploy your app to Railway step-by-step

set -e  # Exit on error

echo "🚀 Railway Deployment Script"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if Railway CLI is installed
echo "📦 Step 1: Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
    echo -e "${GREEN}✅ Railway CLI installed!${NC}"
else
    echo -e "${GREEN}✅ Railway CLI is already installed${NC}"
fi
echo ""

# Step 2: Login to Railway
echo "🔐 Step 2: Login to Railway"
echo "This will open a browser window for authentication..."
railway login
echo -e "${GREEN}✅ Logged in to Railway${NC}"
echo ""

# Step 3: Link or create Railway project
echo "📂 Step 3: Link to Railway Project"
echo "Choose an option:"
echo "  1) Link to existing Railway project"
echo "  2) Create new Railway project"
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    railway link
elif [ "$choice" = "2" ]; then
    railway init
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Railway project linked${NC}"
echo ""

# Step 4: Set environment variables
echo "⚙️  Step 4: Configure Environment Variables"
echo "You need to set the following environment variables:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - NODE_ENV=production"
echo ""
echo "Options:"
echo "  1) Set variables now via CLI (recommended for quick setup)"
echo "  2) Set variables manually via Railway Dashboard (more secure)"
echo "  3) Skip (variables already set)"
read -p "Enter your choice (1, 2, or 3): " var_choice

if [ "$var_choice" = "1" ]; then
    echo ""
    read -p "Enter NEXT_PUBLIC_SUPABASE_URL: " supabase_url
    railway variables set NEXT_PUBLIC_SUPABASE_URL="$supabase_url"
    
    read -p "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon_key
    railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
    
    read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " service_role_key
    railway variables set SUPABASE_SERVICE_ROLE_KEY="$service_role_key"
    
    railway variables set NODE_ENV="production"
    
    echo -e "${GREEN}✅ Environment variables set${NC}"
elif [ "$var_choice" = "2" ]; then
    echo ""
    echo "Please set the variables in Railway Dashboard:"
    echo "1. Go to: https://railway.app/dashboard"
    echo "2. Select your project"
    echo "3. Go to Variables tab"
    echo "4. Add each variable"
    echo ""
    read -p "Press Enter when done..."
    echo -e "${GREEN}✅ Proceed to next step${NC}"
elif [ "$var_choice" = "3" ]; then
    echo -e "${YELLOW}⚠️  Skipping environment variable setup${NC}"
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi
echo ""

# Step 5: Commit Railway configuration files
echo "📝 Step 5: Committing Railway configuration..."
git add railway.json nixpacks.toml RAILWAY_DEPLOYMENT_GUIDE.md
git commit -m "chore: add Railway deployment configuration" || echo "No changes to commit"
echo -e "${GREEN}✅ Configuration committed${NC}"
echo ""

# Step 6: Deploy to Railway
echo "🚀 Step 6: Deploying to Railway"
echo "This will:"
echo "  - Upload your code"
echo "  - Run npm install"
echo "  - Run npm run build"
echo "  - Start your app with npm start"
echo ""
read -p "Ready to deploy? (y/n): " deploy_choice

if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
    railway up
    echo -e "${GREEN}✅ Deployment initiated${NC}"
else
    echo -e "${YELLOW}Deployment cancelled. You can deploy later with: railway up${NC}"
    exit 0
fi
echo ""

# Step 7: Show deployment status
echo "📊 Step 7: Checking deployment status..."
echo "View logs with: railway logs"
echo ""

# Step 8: Get app URL
echo "🌐 Step 8: Getting your app URL..."
railway domain
echo ""

echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. View logs: railway logs"
echo "  2. Open app: railway open"
echo "  3. Check status: railway status"
echo ""
echo "Your app is deploying to Railway!"
echo "Monitor the deployment in Railway Dashboard: https://railway.app/dashboard"

