#!/bin/bash
# Fix all supabase-server imports

files=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '@/lib/supabase-server'")

for file in $files; do
  if [[ $file == *"/api/"* ]] || [[ $file == *"route.ts"* ]]; then
    # API routes should use createServiceClient
    sed -i '' "s/import { createClient } from '@\/lib\/supabase-server'/import { createServiceClient } from '@\/lib\/supabase-server'/g" "$file"
    sed -i '' 's/const supabase = createClient()/const supabase = createServiceClient()/g' "$file"
    sed -i '' 's/const supabase = await createClient()/const supabase = createServiceClient()/g' "$file"
  else
    # Other files use createServerSupabaseClient
    sed -i '' "s/import { createClient } from '@\/lib\/supabase-server'/import { createServerSupabaseClient } from '@\/lib\/supabase-server'/g" "$file"
    sed -i '' 's/const supabase = createClient()/const supabase = await createServerSupabaseClient()/g' "$file"
  fi
  echo "Fixed: $file"
done

echo "Done! Fixed all imports."
