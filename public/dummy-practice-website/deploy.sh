#!/bin/bash

# Quick deployment script for dummy practice website
# Usage: ./deploy.sh [vercel|netlify|github]

set -e

echo "🚀 Deploying Dummy Practice Website..."
echo ""

# Check if deployment method is provided
DEPLOY_METHOD=${1:-vercel}

case $DEPLOY_METHOD in
  vercel)
    echo "📦 Deploying to Vercel..."
    if ! command -v vercel &> /dev/null; then
      echo "❌ Vercel CLI not found. Installing..."
      npm install -g vercel
    fi
    vercel --prod
    echo ""
    echo "✅ Deployed! Add your domain 'dentalcrmtest.com' in Vercel dashboard"
    ;;
    
  netlify)
    echo "📦 Deploying to Netlify..."
    if ! command -v netlify &> /dev/null; then
      echo "❌ Netlify CLI not found. Installing..."
      npm install -g netlify-cli
    fi
    netlify deploy --prod
    echo ""
    echo "✅ Deployed! Add your domain 'dentalcrmtest.com' in Netlify dashboard"
    ;;
    
  github)
    echo "📦 Preparing for GitHub Pages..."
    echo ""
    echo "To deploy to GitHub Pages:"
    echo "1. Create a new GitHub repository"
    echo "2. Run these commands:"
    echo ""
    echo "   git init"
    echo "   git add index.html"
    echo "   git commit -m 'Initial commit'"
    echo "   git branch -M main"
    echo "   git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. Go to repository Settings → Pages"
    echo "4. Enable Pages and add custom domain 'dentalcrmtest.com'"
    ;;
    
  *)
    echo "❌ Unknown deployment method: $DEPLOY_METHOD"
    echo "Usage: ./deploy.sh [vercel|netlify|github]"
    exit 1
    ;;
esac

echo ""
echo "📝 Don't forget to:"
echo "   1. Update the form URL in index.html with your CRM form"
echo "   2. Configure DNS at your domain registrar"
echo "   3. Wait for DNS propagation (5 min - 48 hours)"
echo ""
echo "🎉 Happy testing!"



