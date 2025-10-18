/**
 * Feature Matrix Generator
 * Inspects codebase to generate comprehensive feature matrix
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'
import { ensureOutputDir, logSuccess } from './safety-guard'

interface Feature {
  module: string
  feature: string
  status: 'Complete' | 'In Progress' | 'Planned'
  notes: string
  files?: string[]
}

ensureOutputDir()

/**
 * Check if route/component exists
 */
async function checkExists(pattern: string): Promise<boolean> {
  const files = await glob(pattern, { cwd: process.cwd() })
  return files.length > 0
}

/**
 * Check for TODO markers
 */
async function hasTODOs(pattern: string): Promise<boolean> {
  const files = await glob(pattern, { cwd: process.cwd() })
  for (const file of files) {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8')
    if (/TODO|FIXME|WIP/i.test(content)) {
      return true
    }
  }
  return false
}

/**
 * Build feature matrix
 */
async function buildMatrix() {
  console.log('📊 Building feature matrix...')
  
  const features: Feature[] = []
  
  // Define features to check
  const featureChecks = [
    // Core CRM
    { module: 'CRM', feature: 'Contact Management', pattern: 'src/app/contacts/page.tsx' },
    { module: 'CRM', feature: 'Deal/Pipeline Management', pattern: 'src/app/deals/page.tsx' },
    { module: 'CRM', feature: 'Task Management', pattern: 'src/app/tasks/page.tsx' },
    { module: 'CRM', feature: 'Calendar & Scheduling', pattern: 'src/app/calendar/page.tsx' },
    { module: 'CRM', feature: 'Activity Timeline', pattern: 'src/components/activities/**/*.tsx' },
    { module: 'CRM', feature: 'Kanban Board', pattern: 'src/components/pipeline/**/*.tsx' },
    
    // Marketing
    { module: 'Marketing', feature: 'Campaign Management', pattern: 'src/app/marketing/campaigns/**/*.tsx' },
    { module: 'Marketing', feature: 'Email Templates', pattern: 'src/app/marketing/templates/**/*.tsx' },
    { module: 'Marketing', feature: 'Marketing Automation', pattern: 'src/app/marketing/journeys/**/*.tsx' },
    { module: 'Marketing', feature: 'Audience Segmentation', pattern: 'src/app/marketing/audiences/**/*.tsx' },
    { module: 'Marketing', feature: 'Marketing Audit Tool', pattern: 'src/app/marketing-audit/**/*.tsx' },
    { module: 'Marketing', feature: 'Social Media Integration', pattern: 'src/app/marketing/social-media/**/*.tsx' },
    { module: 'Marketing', feature: 'Landing Page Builder', pattern: 'src/components/marketing/**/landing*.tsx' },
    
    // Forms
    { module: 'Forms', feature: 'Form Builder', pattern: 'src/app/forms/**/page.tsx' },
    { module: 'Forms', feature: 'Form Templates', pattern: 'src/app/forms/templates/**/*.tsx' },
    { module: 'Forms', feature: 'Form Analytics', pattern: 'src/components/forms/**/*analytic*.tsx' },
    { module: 'Forms', feature: 'Form Submissions', pattern: 'src/app/api/marketing/forms/submit/**/*.ts' },
    
    // Automations
    { module: 'Automation', feature: 'Workflow Builder', pattern: 'src/app/automations/create/**/*.tsx' },
    { module: 'Automation', feature: 'Trigger System', pattern: 'src/lib/automations/triggers*.ts' },
    { module: 'Automation', feature: 'Action Executor', pattern: 'src/lib/automations/*executor*.ts' },
    { module: 'Automation', feature: 'Automation Testing', pattern: 'src/lib/automations/*test*.ts' },
    
    // AI Features
    { module: 'AI', feature: 'Call Transcription', pattern: 'src/app/api/ai/transcribe-call/**/*.ts' },
    { module: 'AI', feature: 'AI Assistant', pattern: 'src/app/api/ai-assistant/**/*.ts' },
    { module: 'AI', feature: 'Deal Categorization', pattern: 'src/app/api/categorize-deals/**/*.ts' },
    { module: 'AI', feature: 'Email Draft Generation', pattern: 'src/app/api/ai-assistant/draft-email/**/*.ts' },
    
    // Analytics
    { module: 'Analytics', feature: 'Dashboard Analytics', pattern: 'src/app/analytics/**/*.tsx' },
    { module: 'Analytics', feature: 'Revenue Forecasting', pattern: 'src/lib/revenue-forecasting.ts' },
    { module: 'Analytics', feature: 'Natural Language Queries', pattern: 'src/app/api/analytics/nl-to-sql/**/*.ts' },
    { module: 'Analytics', feature: 'Custom Metrics', pattern: 'src/app/analytics/metrics/**/*.tsx' },
    
    // Communications
    { module: 'Communications', feature: 'Email Sending', pattern: 'src/app/api/communications/send-email/**/*.ts' },
    { module: 'Communications', feature: 'SMS Messaging', pattern: 'src/app/api/communications/send-sms/**/*.ts' },
    { module: 'Communications', feature: 'WhatsApp Messaging', pattern: 'src/app/api/communications/send-whatsapp/**/*.ts' },
    { module: 'Communications', feature: 'Voice Calls', pattern: 'src/app/api/communications/initiate-call/**/*.ts' },
    { module: 'Communications', feature: 'Webhook Handling', pattern: 'src/app/api/webhooks/**/*.ts' },
    
    // Integrations
    { module: 'Integrations', feature: 'PMS Integration (Dentrix/OpenDental)', pattern: 'src/lib/integrations/pms/**/*.ts' },
    { module: 'Integrations', feature: 'Stripe Billing', pattern: 'src/app/api/billing/**/*.ts' },
    { module: 'Integrations', feature: 'Google OAuth', pattern: 'src/app/api/marketing-audit/oauth/google/**/*.ts' },
    { module: 'Integrations', feature: 'Integration Health Dashboard', pattern: 'src/components/integrations/integration-health*.tsx' },
    
    // Settings
    { module: 'Settings', feature: 'User Management', pattern: 'src/app/settings/**/page.tsx' },
    { module: 'Settings', feature: 'Role-Based Access Control', pattern: 'src/lib/permissions.ts' },
    { module: 'Settings', feature: 'Branding Customization', pattern: 'src/app/api/settings/branding/**/*.ts' },
    { module: 'Settings', feature: 'Multi-Location Support', pattern: 'src/components/multi-location/**/*.tsx' },
    
    // Import/Export
    { module: 'Data', feature: 'Contact Import', pattern: 'src/app/api/import/contacts/**/*.ts' },
    { module: 'Data', feature: 'Contact Export', pattern: 'src/app/api/export/contacts/**/*.ts' },
    { module: 'Data', feature: 'Deal Export', pattern: 'src/app/api/export/deals/**/*.ts' },
  ]
  
  // Check each feature
  for (const check of featureChecks) {
    const exists = await checkExists(check.pattern)
    const todos = exists ? await hasTODOs(check.pattern) : false
    
    let status: Feature['status']
    let notes = ''
    
    if (!exists) {
      status = 'Planned'
      notes = 'Not yet implemented'
    } else if (todos) {
      status = 'In Progress'
      notes = 'Implementation in progress'
    } else {
      status = 'Complete'
      notes = 'Fully functional'
    }
    
    features.push({
      module: check.module,
      feature: check.feature,
      status,
      notes,
      files: exists ? await glob(check.pattern, { cwd: process.cwd() }) : []
    })
  }
  
  // Sort by module, then by status (Complete first)
  features.sort((a, b) => {
    if (a.module !== b.module) {
      return a.module.localeCompare(b.module)
    }
    const statusOrder = { 'Complete': 0, 'In Progress': 1, 'Planned': 2 }
    return statusOrder[a.status] - statusOrder[b.status]
  })
  
  // Generate CSV
  const csv = [
    'Module,Feature,Status,Notes,Files',
    ...features.map(f => {
      const fileCount = f.files?.length || 0
      return `"${f.module}","${f.feature}","${f.status}","${f.notes}","${fileCount} file(s)"`
    })
  ].join('\n')
  
  const csvPath = path.join(process.cwd(), 'CRM screenshots', 'feature_matrix.csv')
  fs.writeFileSync(csvPath, csv)
  console.log(`   ✅ CSV: ${csvPath}`)
  
  // Generate Markdown
  const byModule = features.reduce((acc, f) => {
    if (!acc[f.module]) acc[f.module] = []
    acc[f.module].push(f)
    return acc
  }, {} as Record<string, Feature[]>)
  
  const md = [
    '# Feature Matrix',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total Features:** ${features.length}`,
    '',
    '## Summary',
    '',
    '| Status | Count |',
    '|--------|-------|',
    `| ✅ Complete | ${features.filter(f => f.status === 'Complete').length} |`,
    `| 🚧 In Progress | ${features.filter(f => f.status === 'In Progress').length} |`,
    `| 📋 Planned | ${features.filter(f => f.status === 'Planned').length} |`,
    '',
    '## Features by Module',
    ''
  ]
  
  for (const [module, moduleFeatures] of Object.entries(byModule)) {
    md.push(`### ${module}`)
    md.push('')
    md.push('| Feature | Status | Notes |')
    md.push('|---------|--------|-------|')
    
    for (const f of moduleFeatures) {
      const icon = f.status === 'Complete' ? '✅' : f.status === 'In Progress' ? '🚧' : '📋'
      md.push(`| ${f.feature} | ${icon} ${f.status} | ${f.notes} |`)
    }
    
    md.push('')
  }
  
  const mdPath = path.join(process.cwd(), 'CRM screenshots', 'feature_matrix.md')
  fs.writeFileSync(mdPath, md.join('\n'))
  console.log(`   ✅ Markdown: ${mdPath}`)
  
  // Stats
  const complete = features.filter(f => f.status === 'Complete').length
  const total = features.length
  const percentage = Math.round((complete / total) * 100)
  
  console.log(`\n📊 Feature Completion: ${complete}/${total} (${percentage}%)`)
  console.log(`   ✅ Complete: ${complete}`)
  console.log(`   🚧 In Progress: ${features.filter(f => f.status === 'In Progress').length}`)
  console.log(`   📋 Planned: ${features.filter(f => f.status === 'Planned').length}`)
  
  logSuccess('feature-matrix')
}

// Run
buildMatrix().catch((error) => {
  console.error('❌ Failed to build feature matrix:', error)
  process.exit(1)
})

