/**
 * Build Screens Manifest
 * Discovers all routes in the app and generates a manifest for screenshots
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'
import { safetyCheck, ensureOutputDir, logSuccess } from './safety-guard'

interface ScreenEntry {
  name: string
  url: string
  requiredRole: 'admin' | 'user' | 'public'
  viewport: ('desktop' | 'mobile')[]
  priority: number
  category: string
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Safety check
safetyCheck(BASE_URL)
ensureOutputDir()

/**
 * Hardcoded fallback routes (comprehensive coverage)
 */
const FALLBACK_ROUTES: Omit<ScreenEntry, 'priority'>[] = [
  // Public pages
  { name: 'login', url: '/login', requiredRole: 'public', viewport: ['desktop', 'mobile'], category: 'Auth' },
  { name: 'signup', url: '/sign-up', requiredRole: 'public', viewport: ['desktop', 'mobile'], category: 'Auth' },
  { name: 'reset-password', url: '/reset-password', requiredRole: 'public', viewport: ['desktop', 'mobile'], category: 'Auth' },
  
  // Core CRM
  { name: 'dashboard', url: '/dashboard', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'Core' },
  { name: 'contacts-list', url: '/contacts', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'contacts-new', url: '/contacts/new', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'deals-list', url: '/deals', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'pipeline', url: '/pipeline', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'tasks-list', url: '/tasks', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'tasks-new', url: '/tasks/new', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  { name: 'calendar', url: '/calendar', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'CRM' },
  
  // Automations
  { name: 'automations-list', url: '/automations', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Automation' },
  { name: 'automations-create', url: '/automations/create', requiredRole: 'admin', viewport: ['desktop'], category: 'Automation' },
  
  // Marketing
  { name: 'marketing-hub', url: '/marketing', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Marketing' },
  { name: 'marketing-campaigns', url: '/marketing/campaigns', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Marketing' },
  { name: 'marketing-audiences', url: '/marketing/audiences', requiredRole: 'admin', viewport: ['desktop'], category: 'Marketing' },
  { name: 'marketing-journeys', url: '/marketing/journeys', requiredRole: 'admin', viewport: ['desktop'], category: 'Marketing' },
  { name: 'marketing-templates', url: '/marketing/templates', requiredRole: 'admin', viewport: ['desktop'], category: 'Marketing' },
  { name: 'marketing-reports', url: '/marketing/reports', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Marketing' },
  { name: 'marketing-social', url: '/marketing/social-media', requiredRole: 'admin', viewport: ['desktop'], category: 'Marketing' },
  { name: 'marketing-audit', url: '/marketing-audit', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Marketing' },
  
  // Forms
  { name: 'forms-list', url: '/forms', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Forms' },
  { name: 'forms-templates', url: '/forms/templates', requiredRole: 'admin', viewport: ['desktop'], category: 'Forms' },
  
  // Analytics
  { name: 'analytics', url: '/analytics', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Analytics' },
  { name: 'analytics-metrics', url: '/analytics/metrics', requiredRole: 'admin', viewport: ['desktop'], category: 'Analytics' },
  
  // Integrations
  { name: 'integrations', url: '/integrations', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Integrations' },
  
  // Settings
  { name: 'settings-general', url: '/settings', requiredRole: 'admin', viewport: ['desktop', 'mobile'], category: 'Settings' },
  { name: 'settings-marketing', url: '/settings/marketing', requiredRole: 'admin', viewport: ['desktop'], category: 'Settings' },
  { name: 'settings-calendar', url: '/settings/calendar', requiredRole: 'admin', viewport: ['desktop'], category: 'Settings' },
  
  // Notifications
  { name: 'notifications', url: '/notifications', requiredRole: 'user', viewport: ['desktop', 'mobile'], category: 'Core' },
]

/**
 * Discover routes from Next.js app directory
 */
async function discoverRoutes(): Promise<Set<string>> {
  const routes = new Set<string>()
  
  try {
    // Find all page.tsx and page.ts files in app directory
    const pageFiles = await glob('app/**/page.{tsx,ts}', {
      cwd: process.cwd(),
      ignore: ['**/api/**', '**/node_modules/**'],
    })
    
    for (const file of pageFiles) {
      // Convert file path to route
      // app/dashboard/page.tsx -> /dashboard
      // app/(auth)/login/page.tsx -> /login
      let route = file
        .replace(/^app/, '')
        .replace(/\/page\.(tsx|ts)$/, '')
        .replace(/\/\([^)]+\)/g, '') // Remove route groups
      
      if (!route) route = '/'
      if (!route.startsWith('/')) route = '/' + route
      
      // Skip API routes
      if (!route.includes('/api/')) {
        routes.add(route)
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not discover routes from filesystem:', error)
  }
  
  return routes
}

/**
 * Assign priority based on route importance
 */
function assignPriority(url: string, category: string): number {
  // High priority (1-3)
  if (url === '/dashboard' || url === '/login') return 1
  if (category === 'Core') return 2
  if (category === 'CRM') return 3
  
  // Medium priority (4-6)
  if (category === 'Marketing' || category === 'Analytics') return 4
  if (category === 'Automation') return 5
  if (category === 'Forms') return 6
  
  // Lower priority (7-9)
  if (category === 'Settings') return 7
  if (category === 'Integrations') return 8
  
  return 9
}

/**
 * Build complete manifest
 */
async function buildManifest() {
  console.log('🔍 Discovering routes...')
  
  const discoveredRoutes = await discoverRoutes()
  console.log(`   Found ${discoveredRoutes.size} routes from filesystem`)
  
  // Merge with fallback routes
  const allRoutes = new Map<string, ScreenEntry>()
  
  // Add fallback routes first
  FALLBACK_ROUTES.forEach((route) => {
    const priority = assignPriority(route.url, route.category)
    allRoutes.set(route.url, { ...route, priority })
  })
  
  // Add discovered routes that aren't in fallback
  discoveredRoutes.forEach((url) => {
    if (!allRoutes.has(url)) {
      allRoutes.set(url, {
        name: url.slice(1).replace(/\//g, '-') || 'home',
        url,
        requiredRole: url.includes('settings') ? 'admin' : 'user',
        viewport: ['desktop', 'mobile'],
        category: 'Other',
        priority: 9,
      })
    }
  })
  
  // Convert to sorted array
  const manifest = Array.from(allRoutes.values()).sort((a, b) => a.priority - b.priority)
  
  // Load seed IDs if available
  let seedIds = {}
  const seedIdsPath = path.join(process.cwd(), 'CRM screenshots', 'seed_ids.json')
  if (fs.existsSync(seedIdsPath)) {
    seedIds = JSON.parse(fs.readFileSync(seedIdsPath, 'utf-8'))
    
    // Replace dynamic routes with actual IDs
    if (seedIds.contactId) {
      const contactRoute = manifest.find(r => r.url === '/contacts/new')
      if (contactRoute) {
        manifest.push({
          ...contactRoute,
          name: 'contact-detail',
          url: `/contacts/${seedIds.contactId}`,
        })
      }
    }
    
    if (seedIds.dealId) {
      manifest.push({
        name: 'deal-detail',
        url: `/deals/${seedIds.dealId}`,
        requiredRole: 'user',
        viewport: ['desktop', 'mobile'],
        category: 'CRM',
        priority: 3,
      })
    }
    
    if (seedIds.automationId) {
      manifest.push({
        name: 'automation-detail',
        url: `/automations/${seedIds.automationId}`,
        requiredRole: 'admin',
        viewport: ['desktop'],
        category: 'Automation',
        priority: 5,
      })
    }
  }
  
  // Save manifest
  const outputPath = path.join(process.cwd(), 'CRM screenshots', 'screens_manifest.json')
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2))
  
  console.log(`✅ Generated manifest with ${manifest.length} screens`)
  console.log(`   Output: ${outputPath}`)
  
  // Print summary by category
  const byCategory = manifest.reduce((acc, screen) => {
    acc[screen.category] = (acc[screen.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('\n📊 Screens by category:')
  Object.entries(byCategory).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`)
  })
  
  logSuccess('build-screens-manifest')
}

// Run
buildManifest().catch((error) => {
  console.error('❌ Failed to build manifest:', error)
  process.exit(1)
})

