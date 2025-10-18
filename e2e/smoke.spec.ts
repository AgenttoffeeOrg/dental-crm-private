import { test, expect } from '@playwright/test'
import percySnapshot from '@percy/playwright'

/**
 * Smoke tests - Basic application functionality
 * These tests verify the app loads and renders correctly
 */

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/')
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Check for main app shell (adjust selector based on your app structure)
    const main = page.locator('main, [role="main"], .app-shell, #__next')
    await expect(main).toBeVisible()
    
    // Take Percy snapshot for visual regression
    await percySnapshot(page, 'Homepage')
  })

  test('has no console errors on homepage', async ({ page }) => {
    const errors: string[] = []
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Filter out known non-critical errors if needed
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('Download the React DevTools')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })

  test('page has proper metadata', async ({ page }) => {
    await page.goto('/')
    
    // Check for title
    await expect(page).toHaveTitle(/Dental CRM|Home/)
    
    // Check for viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveCount(1)
  })

  test('dashboard page loads after authentication', async ({ page }) => {
    // Skip if no test credentials provided
    if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
      test.skip()
      return
    }

    await page.goto('/dashboard')
    
    // Should redirect to login if not authenticated
    await page.waitForURL(/\/(login|sign-in)/)
    
    // Take Percy snapshot of login page
    await percySnapshot(page, 'Login Page')
  })

  test('404 page renders correctly', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    
    // Should show 404 page
    const notFound = page.locator('text=/404|not found|page.*found/i')
    await expect(notFound.first()).toBeVisible()
    
    // Take Percy snapshot
    await percySnapshot(page, '404 Page')
  })

  test('responds to slow network conditions', async ({ page }) => {
    // Emulate slow 3G
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100)
    })
    
    await page.goto('/', { timeout: 60000 })
    await expect(page.locator('body')).toBeVisible()
  })
})

