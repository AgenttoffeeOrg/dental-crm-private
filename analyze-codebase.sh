#!/bin/bash

echo "🔍 DENTAL CRM - COMPREHENSIVE CODE ANALYSIS"
echo "==========================================="
echo ""

# Count TypeScript/JavaScript files
echo "📊 CODE FILES:"
echo "-------------"
tsx_count=$(find src -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
ts_count=$(find src -name "*.ts" ! -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
test_count=$(find src -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  React Components (.tsx): $tsx_count"
echo "  TypeScript Files (.ts): $ts_count"
echo "  Test Files: $test_count"
echo "  Total Code Files: $((tsx_count + ts_count + test_count))"
echo ""

# Count lines of code
echo "📏 LINES OF CODE:"
echo "----------------"
if command -v cloc &> /dev/null; then
    cloc src --quiet --csv | tail -1 | awk -F',' '{print "  Total Lines: " $5 "\n  Code Lines: " $4 "\n  Comment Lines: " $3 "\n  Blank Lines: " $2}'
else
    # Fallback to basic counting
    total_lines=$(find src -name "*.tsx" -o -name "*.ts" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    echo "  Total Lines (all files): $total_lines"
fi
echo ""

# Count SQL files
echo "🗄️  DATABASE FILES:"
echo "------------------"
sql_count=$(find . -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
sql_lines=$(find . -name "*.sql" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
echo "  SQL Migration Files: $sql_count"
echo "  SQL Lines: $sql_lines"
echo ""

# Count documentation
echo "📚 DOCUMENTATION:"
echo "----------------"
md_count=$(find . -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
md_lines=$(find . -maxdepth 1 -name "*.md" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
echo "  Markdown Files: $md_count"
echo "  Documentation Lines: $md_lines"
echo ""

# Count components by type
echo "🧩 COMPONENT BREAKDOWN:"
echo "----------------------"
echo "  Dashboard Components: $(find src/components/dashboard -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Contact Components: $(find src/components/contacts -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Marketing Components: $(find src/components/marketing -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Task Components: $(find src/components/tasks -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo "  UI Components: $(find src/components/ui -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo "  Pipeline Components: $(find src/components/pipeline -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo ""

# Count API routes
echo "🔌 API ROUTES:"
echo "-------------"
api_count=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  API Endpoints: $api_count"
echo ""

# Count pages
echo "📄 PAGES:"
echo "--------"
page_count=$(find src/app -name "page.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "  Next.js Pages: $page_count"
echo ""

# Dependencies
echo "📦 DEPENDENCIES:"
echo "---------------"
deps=$(grep -c '"' package.json | head -1)
prod_deps=$(jq -r '.dependencies | length' package.json 2>/dev/null)
dev_deps=$(jq -r '.devDependencies | length' package.json 2>/dev/null)
echo "  Production Dependencies: $prod_deps"
echo "  Dev Dependencies: $dev_deps"
echo "  Total Dependencies: $((prod_deps + dev_deps))"
echo ""

# Git statistics
echo "📊 GIT STATISTICS:"
echo "-----------------"
if [ -d .git ]; then
    total_commits=$(git rev-list --count HEAD 2>/dev/null || echo "N/A")
    branch=$(git branch --show-current 2>/dev/null || echo "N/A")
    echo "  Total Commits: $total_commits"
    echo "  Current Branch: $branch"
    echo "  Contributors: $(git log --format='%an' | sort -u | wc -l | tr -d ' ')"
fi
echo ""

echo "✅ Analysis Complete!"

