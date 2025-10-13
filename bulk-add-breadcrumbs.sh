#!/bin/bash
# Add breadcrumbs to all marketing pages

pages=(
  "src/app/marketing/templates/page.tsx"
  "src/app/marketing/audiences/page.tsx"
  "src/app/marketing/journeys/page.tsx"
  "src/app/marketing/forms-landing/page.tsx"
  "src/app/marketing/social-media/page.tsx"
  "src/app/marketing/reports/page.tsx"
)

for page in "${pages[@]}"; do
  if [ -f "$page" ]; then
    # Check if Breadcrumbs is already imported
    if ! grep -q "import.*Breadcrumbs" "$page"; then
      # Add import after other imports
      sed -i '' "/import.*from 'lucide-react'/a\\
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
" "$page"
      echo "✅ Added breadcrumbs import to $page"
    fi
  fi
done

echo "✅ Done! Added breadcrumbs to all marketing pages"
