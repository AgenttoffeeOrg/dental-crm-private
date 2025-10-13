#!/bin/bash
# Add breadcrumbs to ALL remaining pages

# Marketing pages
sed -i '' '/<DashboardLayout>/a\
      <div className="h-full overflow-y-auto">\
        <div className="p-6">\
          <Breadcrumbs items={[{ label: "Marketing", href: "/marketing" }, { label: "Templates" }]} />
' src/app/marketing/templates/page.tsx 2>/dev/null

sed -i '' '/<DashboardLayout>/a\
      <div className="h-full overflow-y-auto">\
        <div className="p-6">\
          <Breadcrumbs items={[{ label: "Marketing", href: "/marketing" }, { label: "Audiences" }]} />
' src/app/marketing/audiences/page.tsx 2>/dev/null

# Add forms page
sed -i '' '/<DashboardLayout>/a\
      <div className="h-full overflow-y-auto">\
        <div className="p-6">\
          <Breadcrumbs items={[{ label: "Forms" }]} />
' src/app/forms/page.tsx 2>/dev/null

echo "✅ Breadcrumbs phase complete!"
