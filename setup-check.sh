#!/bin/bash

# DentalCRM Setup Verification Script
echo "🦷 DentalCRM Setup Verification"
echo "==============================="

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v 2>/dev/null || echo "not found")
if [[ $node_version == "not found" ]]; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
else
    echo "✅ Node.js version: $node_version"
fi

# Check if npm packages are installed
echo "📦 Checking npm packages..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Run 'npm install' first."
    exit 1
else
    echo "✅ npm packages installed"
fi

# Check environment variables
echo "🔧 Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Copy env.example to .env.local and fill in your values."
    echo "   Required variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - OPENAI_API_KEY"
else
    echo "✅ .env.local file exists"
fi

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
if npm run build --silent > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed. Check for type errors."
fi

# Check key files exist
echo "📁 Checking key files..."
key_files=(
    "src/app/layout.tsx"
    "src/app/login/page.tsx"
    "src/app/pipeline/page.tsx"
    "src/app/tasks/page.tsx"
    "src/lib/supabase.ts"
    "supabase/sql/01_initial_schema.sql"
    "supabase/sql/02_seed_data.sql"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🚀 Next Steps:"
echo "1. Set up your Supabase project and run the SQL migrations"
echo "2. Create storage buckets: 'audio' and 'attachments' (both private)"
echo "3. Configure your .env.local with actual values"
echo "4. Create a test user in Supabase Auth or use demo credentials"
echo "5. Run 'npm run dev' to start the development server"
echo ""
echo "📖 See README.md for detailed setup instructions"
