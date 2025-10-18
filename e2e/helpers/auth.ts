import { Page } from '@playwright/test'

/**
 * Helper function to log in a user
 * Uses environment variables for credentials
 */
export async function login(page: Page) {
  const TEST_EMAIL = process.env.TEST_EMAIL || ''
  const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD environment variables are required')
  }

  // Go to login page
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  
  await emailInput.fill(TEST_EMAIL)
  await passwordInput.fill(TEST_PASSWORD)

  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first()
  await submitButton.click()

  // Wait for navigation away from login page
  await page.waitForTimeout(3000)
}

/**
 * Helper function to log out a user
 */
export async function logout(page: Page) {
  // Look for user menu or logout button
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("menu"), [aria-label*="user"]')
  
  if (await userMenu.count() > 0) {
    await userMenu.first().click()
    await page.waitForTimeout(500)
  }

  // Click logout
  const logoutButton = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout")')
  
  if (await logoutButton.count() > 0) {
    await logoutButton.first().click()
    await page.waitForTimeout(2000)
  }
}

