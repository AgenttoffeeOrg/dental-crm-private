/**
 * Playwright Screenshot Runner
 * Captures comprehensive screenshots of all app routes
 * Desktop + Mobile viewports with PII masking
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import fs from 'fs'
import path from 'path'
import { safetyCheck, ensureOutputDir, getGitCommit, getGitBranch, logSuccess } from './safety-guard'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'test.admin@example.com'
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'changeme123!'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test.user@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'changeme123!'

// Safety check
safetyCheck(BASE_URL)
ensureOutputDir()

interface ScreenEntry {
  name: string
  url: string
  requiredRole: 'admin' | 'user' | 'public'
  viewport: ('desktop' | 'mobile')[]
  priority: number
  category: string
}

interface ScreenshotResult {
  name: string
  url: string
  viewport: string
  success: boolean
  error?: string
  timestamp: string
  filePath?: string
}

const DESKTOP_VIEWPORT = { width: 1440, height: 900 }
const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 14

/**
 * Load screens manifest
 */
function loadManifest(): ScreenEntry[] {
  const manifestPath = path.join(process.cwd(), 'CRM screenshots', 'screens_manifest.json')
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Manifest not found! Run: npm run screens:manifest first')
  }
  
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
}

/**
 * Login to app and save auth state
 */
async function login(
  page: Page,
  email: string,
  password: string,
  storageStatePath: string
): Promise<void> {
  console.log(`   Logging in as: ${email}`)
  
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  
  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })
  
  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"], input[name="password"]', password)
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
  
  // Wait for redirect to dashboard or main app
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })
    console.log('   ✅ Login successful')
  } catch (error) {
    console.warn('   ⚠️  Login might have failed - continuing anyway')
  }
  
  // Save auth state
  await page.context().storageState({ path: storageStatePath })
  console.log(`   💾 Saved auth state: ${storageStatePath}`)
}

/**
 * Apply PII masking to page before screenshot
 */
async function maskPII(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-testid="pii-email"],
      [data-testid="pii-phone"],
      [data-testid="pii-address"],
      .pii-mask {
        filter: blur(8px) !important;
      }
    `
  })
}

/**
 * Dismiss any toast notifications or modals
 */
async function dismissOverlays(page: Page): Promise<void> {
  // Try to close any visible toasts
  try {
    const closeButtons = page.locator('[data-sonner-toast] button, [role="status"] button[aria-label*="close"]')
    const count = await closeButtons.count()
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {})
    }
  } catch {}
  
  // Try to close any modals/dialogs
  try {
    await page.locator('[role="dialog"] button[aria-label*="close"]').click({ timeout: 1000 }).catch(() => {})
  } catch {}
}

/**
 * Capture screenshot with retries
 */
async function captureWithRetry(
  page: Page,
  screen: ScreenEntry,
  viewport: 'desktop' | 'mobile',
  index: number,
  maxRetries = 2
): Promise<ScreenshotResult> {
  const url = BASE_URL + screen.url
  const viewportSize = viewport === 'desktop' ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT
  const fileName = `${String(index).padStart(3, '0')}_${screen.name}_${viewport}.png`
  const filePath = path.join(process.cwd(), 'CRM screenshots', fileName)
  
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`   📸 [${attempt}/${maxRetries + 1}] ${screen.name} (${viewport})`)
      
      // Set viewport
      await page.setViewportSize(viewportSize)
      
      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })
      
      // Wait for app shell to load
      try {
        await page.waitForSelector('header, nav, #__next, [data-testid="app-shell"]', {
          timeout: 10000,
          state: 'visible'
        })
      } catch {
        console.warn('      App shell not found - continuing anyway')
      }
      
      // Wait a bit for animations/loading
      await page.waitForTimeout(1000)
      
      // Dismiss any overlays
      await dismissOverlays(page)
      
      // Apply PII masking
      await maskPII(page)
      
      // Scroll to bottom and back to top (loads lazy content)
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(500)
      
      // Take screenshot
      await page.screenshot({
        path: filePath,
        fullPage: true,
        timeout: 30000
      })
      
      console.log(`      ✅ Saved: ${fileName}`)
      
      return {
        name: screen.name,
        url: screen.url,
        viewport,
        success: true,
        timestamp: new Date().toISOString(),
        filePath: fileName
      }
      
    } catch (error) {
      lastError = error as Error
      console.warn(`      ⚠️  Attempt ${attempt} failed: ${error.message}`)
      
      if (attempt <= maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000
        console.log(`      ⏳ Retrying in ${backoff}ms...`)
        await page.waitForTimeout(backoff)
      }
    }
  }
  
  // All retries failed
  console.error(`      ❌ Failed after ${maxRetries + 1} attempts`)
  
  return {
    name: screen.name,
    url: screen.url,
    viewport,
    success: false,
    error: lastError?.message || 'Unknown error',
    timestamp: new Date().toISOString()
  }
}

/**
 * Main screenshot runner
 */
async function runScreenshots() {
  console.log('📸 Starting screenshot capture...')
  console.log(`   Base URL: ${BASE_URL}`)
  
  const manifest = loadManifest()
  console.log(`   Total screens: ${manifest.length}`)
  
  const results: ScreenshotResult[] = []
  let browser: Browser | undefined
  
  try {
    // Launch browser
    console.log('\n🚀 Launching Chromium...')
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage']
    })
    
    const outputDir = path.join(process.cwd(), 'CRM screenshots')
    const adminStatePath = path.join(outputDir, 'admin_auth.json')
    const userStatePath = path.join(outputDir, 'user_auth.json')
    
    // Create auth contexts
    console.log('\n🔐 Setting up authentication...')
    
    // Admin login
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await login(adminPage, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, adminStatePath)
    await adminPage.close()
    await adminContext.close()
    
    // User login
    const userContext = await browser.newContext()
    const userPage = await userContext.newPage()
    await login(userPage, TEST_USER_EMAIL, TEST_USER_PASSWORD, userStatePath)
    await userPage.close()
    await userContext.close()
    
    // Create screenshot contexts with saved auth
    console.log('\n📸 Capturing screenshots...\n')
    
    const adminScreenContext = await browser.newContext({
      storageState: adminStatePath
    })
    const userScreenContext = await browser.newContext({
      storageState: userStatePath
    })
    const publicContext = await browser.newContext()
    
    const adminScreenPage = await adminScreenContext.newPage()
    const userScreenPage = await userScreenContext.newPage()
    const publicPage = await publicContext.newPage()
    
    // Capture all screens
    for (let i = 0; i < manifest.length; i++) {
      const screen = manifest[i]
      
      // Select appropriate page based on required role
      let page: Page
      if (screen.requiredRole === 'public') {
        page = publicPage
      } else if (screen.requiredRole === 'user') {
        page = userScreenPage
      } else {
        page = adminScreenPage
      }
      
      // Capture each viewport
      for (const viewport of screen.viewport) {
        const result = await captureWithRetry(page, screen, viewport as 'desktop' | 'mobile', i + 1)
        results.push(result)
      }
    }
    
    // Close contexts
    await adminScreenContext.close()
    await userScreenContext.close()
    await publicContext.close()
    
  } finally {
    if (browser) {
      await browser.close()
    }
  }
  
  // Save results
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length
  
  console.log(`\n✅ Screenshot capture complete!`)
  console.log(`   Success: ${successCount}`)
  console.log(`   Failed: ${failedCount}`)
  
  // Save provenance
  const provenance = {
    timestamp: new Date().toISOString(),
    gitCommit: getGitCommit(),
    gitBranch: getGitBranch(),
    baseUrl: BASE_URL,
    totalScreens: results.length,
    successful: successCount,
    failed: failedCount,
    results: results
  }
  
  const provenancePath = path.join(process.cwd(), 'CRM screenshots', 'screens_provenance.json')
  fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2))
  console.log(`   📋 Provenance: ${provenancePath}`)
  
  // Save failed routes
  const failed = results.filter(r => !r.success).map(r => ({
    name: r.name,
    url: r.url,
    viewport: r.viewport,
    error: r.error
  }))
  
  const failedPath = path.join(process.cwd(), 'CRM screenshots', 'failed_routes.json')
  fs.writeFileSync(failedPath, JSON.stringify(failed, null, 2))
  console.log(`   ❌ Failed routes: ${failedPath}`)
  
  if (failedCount > 0) {
    console.log('\n⚠️  Some screenshots failed. Check failed_routes.json for details.')
  }
  
  logSuccess('screenshot-all')
}

// Run
runScreenshots().catch((error) => {
  console.error('❌ Screenshot runner failed:', error)
  process.exit(1)
})

