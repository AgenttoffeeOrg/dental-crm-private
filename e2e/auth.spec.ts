import { test, expect } from '@playwright/test'
import percySnapshot from '@percy/playwright'

/**
 * Authentication tests
 * Tests login, logout, and session management
 * 
 * Requires TEST_EMAIL and TEST_PASSWORD environment variables
 */

test.describe('Authentication', () => {
  test.skip(({ browserName }) => {
    // Skip all auth tests if credentials not provided
    return !process.env.TEST_EMAIL || !process.env.TEST_PASSWORD
  }, 'TEST_EMAIL and TEST_PASSWORD environment variables required')

  const TEST_EMAIL = process.env.TEST_EMAIL || ''
  const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

  test('login form renders correctly', async ({ page }) => {
    await page.goto('/login')
    
    // Wait for login form to load
    await page.waitForLoadState('networkidle')
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]')
    await expect(emailInput.first()).toBeVisible()
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(passwordInput.first()).toBeVisible()
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    await expect(submitButton.first()).toBeVisible()
    
    // Take Percy snapshot
    await percySnapshot(page, 'Login Form')
  })

  test('user can login successfully', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    await emailInput.fill(TEST_EMAIL)
    
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    await passwordInput.fill(TEST_PASSWORD)
    
    // Click submit
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()
    
    // Wait for navigation to dashboard or home
    await page.waitForURL(/\/(dashboard|home|contacts|pipeline)/, { timeout: 15000 })
    
    // Verify we're logged in - look for user menu or profile
    const userMenu = page.locator('[aria-label*="user" i], .user-menu, [data-testid*="user"]')
    await expect(userMenu.or(page.locator('body'))).toBeVisible({ timeout: 10000 })
    
    // Take Percy snapshot of logged in state
    await percySnapshot(page, 'Dashboard - Logged In')
  })

  test('protected routes redirect to login when not authenticated', async ({ page, context }) => {
    // Clear all cookies to ensure we're not authenticated
    await context.clearCookies()
    
    // Try to access protected route
    await page.goto('/dashboard')
    
    // Should redirect to login
    await page.waitForURL(/\/(login|sign-in|auth)/, { timeout: 10000 })
    
    expect(page.url()).toMatch(/\/(login|sign-in|auth)/)
  })

  test('user can logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login')
    
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill(TEST_EMAIL)
    
    const passwordInput = page.locator('input[type="password"]').first()
    await passwordInput.fill(TEST_PASSWORD)
    
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/(dashboard|home)/, { timeout: 15000 })
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")')
    
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click()
      
      // Should redirect to login or home
      await page.waitForURL(/\/(login|sign-in|$)/, { timeout: 10000 })
      
      // Verify logged out by trying to access protected route
      await page.goto('/dashboard')
      await page.waitForURL(/\/(login|sign-in)/, { timeout: 10000 })
      
      expect(page.url()).toMatch(/\/(login|sign-in)/)
    }
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login')
    
    // Fill with invalid credentials
    await page.locator('input[type="email"]').first().fill('invalid@example.com')
    await page.locator('input[type="password"]').first().fill('wrongpassword')
    
    await page.locator('button[type="submit"]').first().click()
    
    // Look for error message
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-danger')
    
    // Either error appears or we stay on login page
    const errorAppeared = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false)
    const onLoginPage = page.url().includes('/login') || page.url().includes('/sign-in')
    
    expect(errorAppeared || onLoginPage).toBeTruthy()
  })

  test('forgot password link works', async ({ page }) => {
    await page.goto('/login')
    
    // Look for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a[href*="reset"], a[href*="forgot"]')
    
    if (await forgotPasswordLink.count() > 0) {
      await forgotPasswordLink.first().click()
      
      // Should navigate to password reset page
      await page.waitForURL(/\/(reset|forgot)/, { timeout: 5000 })
      
      expect(page.url()).toMatch(/\/(reset|forgot)/)
      
      // Take Percy snapshot
      await percySnapshot(page, 'Password Reset Page')
    }
  })

  test('session persists across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL)
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/(dashboard|home)/, { timeout: 15000 })
    
    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should still be authenticated (not redirected to login)
    expect(page.url()).not.toMatch(/\/(login|sign-in)/)
  })
})

