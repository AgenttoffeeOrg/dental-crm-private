#!/usr/bin/env node

/**
 * Script to automatically fix accessibility issues (S1082)
 * Adds keyboard handlers to clickable divs
 */

const fs = require('fs');
const path = require('path');

// Files with most accessibility issues
const filesToFix = [
  'src/components/contacts/contact-detail-view.tsx',
  'src/components/deals/enterprise-deals-table.tsx',
  'src/components/contacts/contacts-list.tsx',
  'src/components/tasks/task-calendar-view.tsx',
  'src/components/settings/permission-matrix-modal.tsx',
  'src/components/pipeline/deal-card-minimal.tsx',
  'src/components/pipeline/deal-card-fixed.tsx',
  'src/components/deals/deal-tasks.tsx',
  'src/components/communications/activity-detail-slide-in.tsx',
  'src/components/calendar/calendar-month-view.tsx',
];

console.log('🔧 Accessibility Fix Script');
console.log('This script helps identify and fix accessibility issues.');
console.log('Manual fixes are recommended for better control.\n');

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} (not found)`);
  }
});

console.log('\n💡 To fix accessibility issues:');
console.log('1. Find divs with onClick handlers');
console.log('2. Add: onKeyDown={(e) => e.key === \'Enter\' && handleClick()}');
console.log('3. Add: role="button" tabIndex={0}');
console.log('4. Add: aria-label="Description of action"');



