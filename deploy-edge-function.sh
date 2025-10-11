#!/bin/bash

# DentalCRM Edge Function Deployment Script
echo "🚀 Deploying DentalCRM AI Edge Function"
echo "======================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project."
    echo "   Run: supabase link --project-ref YOUR_PROJECT_ID"
    exit 1
fi

# Deploy the Edge Function
echo "📦 Deploying process-call-activity function..."
supabase functions deploy process-call-activity

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Set OPENAI_API_KEY in Supabase Dashboard → Settings → Edge Functions"
    echo "2. Test the function with a sample activity"
    echo "3. Check function logs for any issues"
    echo ""
    echo "📖 See supabase/functions/README.md for detailed documentation"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
