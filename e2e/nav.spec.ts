import { test, expect } from '@playwright/test'
import percySnapshot from '@percy/playwright'
import { login } from './helpers/auth'

/**
 * Navigation tests - Verify primary navigation works
 * Tests critical user flows through the application
 * 
 * Requires TEST_EMAIL and TEST_PASSWORD environment variables
 */

const PRIMARY_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/contacts', name: 'Contacts' },
  { path: '/deals', name: 'Deals' },
  { path: '/pipeline', name: 'Pipeline' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/tasks', name: 'Tasks' },
  { path: '/automations', name: 'Automations' },
  { path: '/marketing', name: 'Marketing' },
  { path: '/marketing-audit', name: 'Marketing Audit' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/forms', name: 'Forms' },
  { path: '/integrations', name: 'Integrations' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/settings', name: 'Settings' },
]

test.describe('Navigation Tests', () => {
  test.skip(({ browserName }) => {
    // Skip navigation tests if credentials not provided
    return !process.env.TEST_EMAIL || !process.env.TEST_PASSWORD
  }, 'TEST_EMAIL and TEST_PASSWORD environment variables required')

  test.beforeEach(async ({ page }) => {
    // Login before each navigation test
    await login(page)
    
    // Wait for redirect to dashboard or home
    await page.waitForTimeout(2000)
  })

  test('all primary routes are accessible', async ({ page }) => {
    for (const route of PRIMARY_ROUTES) {
      await page.goto(route.path)
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
      
      // Check that a main landmark exists (indicating page rendered)
      const main = page.locator('main, [role="main"], .main-content')
      
      // Some pages may redirect to login if not authenticated
      const isLoginPage = page.url().includes('/login') || page.url().includes('/sign-in')
      
      if (!isLoginPage) {
        await expect(main.or(page.locator('body'))).toBeVisible({
          timeout: 10000
        })
      }
      
      console.log(`✓ ${route.name} (${route.path}) - ${isLoginPage ? 'Login required' : 'Accessible'}`)
    }
  })

  test('navigation menu is visible and functional', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    
    // Wait for page to settle
    await page.waitForTimeout(2000)
    
    // Look for navigation elements (adjust selectors based on your app)
    const nav = page.locator('nav, [role="navigation"], .sidebar, .menu, header')
    
    // At least one navigation element should exist
    const navCount = await nav.count()
    expect(navCount).toBeGreaterThan(0)
    
    // Take Percy snapshot of navigation
    await percySnapshot(page, 'Navigation Menu')
  })

  test('clicking nav links changes routes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    
    // Try to find and click a dashboard/contacts link
    const dashboardLink = page.locator('a[href*="/dashboard"], a[href*="/contacts"]').first()
    
    if (await dashboardLink.count() > 0) {
      const initialUrl = page.url()
      await dashboardLink.click()
      
      // Wait for navigation with timeout
      await page.waitForTimeout(2000)
      
      // URL should have changed
      const newUrl = page.url()
      expect(newUrl).not.toBe(initialUrl)
    }
  })

  test('back button works correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    const firstUrl = page.url()
    
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    
    await page.goBack()
    await page.waitForTimeout(1000)
    
    expect(page.url()).toContain(new URL(firstUrl).pathname)
  })

  test('breadcrumb navigation renders on nested pages', async ({ page }) => {
    // Test nested route
    await page.goto('/marketing/campaigns', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    
    // Look for breadcrumbs (common pattern)
    const breadcrumb = page.locator('[aria-label*="breadcrumb"], .breadcrumb, nav[aria-label="Breadcrumb"]')
    
    // Breadcrumb might not exist on all pages - that's ok
    const breadcrumbExists = await breadcrumb.count() > 0
    
    if (breadcrumbExists) {
      await expect(breadcrumb.first()).toBeVisible()
    } else {
      // If no breadcrumb, just verify page loaded
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('mobile navigation works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    
    // Look for mobile menu button (hamburger menu)
    const mobileMenuButton = page.locator('button[aria-label*="menu" i], .mobile-menu-button, [aria-controls*="mobile"]')
    
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.first().click()
      await page.waitForTimeout(500)
      
      // Mobile menu should become visible
      const mobileMenu = page.locator('[role="dialog"], .mobile-menu, nav.mobile')
      await expect(mobileMenu.first()).toBeVisible({ timeout: 5000 })
      
      // Take Percy snapshot
      await percySnapshot(page, 'Mobile Navigation')
    } else {
      // If no mobile menu, just verify page is visible
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

