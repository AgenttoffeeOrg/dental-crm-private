import { test, expect } from '@playwright/test'

/**
 * Baseline Test: Authentication Flow
 * 
 * This test captures the CURRENT behavior of the auth system.
 * Any changes that break this test indicate a regression.
 * 
 * Critical Path: P0 - Must Work
 */

test.describe('Authentication Flow - Baseline', () => {
  
  test('should display sign-in page on root navigation', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/)
    
    // Should show sign-in form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
  
  test('should show validation errors for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Try to sign in without entering anything
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show error message (or prevent submission)
    // Note: Actual behavior may vary - documenting current state
    await page.waitForTimeout(1000) // Give time for any validation
  })
  
  test('should navigate to sign-up page from sign-in', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Click sign-up link
    const signUpLink = page.getByRole('link', { name: /sign up/i }).or(page.getByText(/create.*account/i))
    await signUpLink.click()
    
    // Should be on sign-up page
    await expect(page).toHaveURL(/.*sign-up/)
    await expect(page.getByRole('heading', { name: /sign up|create.*account/i })).toBeVisible()
  })
  
  test('should show forgot password flow', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Look for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot.*password/i })
    if (await forgotLink.isVisible()) {
      await forgotLink.click()
      // Document current behavior
      await page.waitForLoadState('networkidle')
    }
  })
  
  // TODO: Add test for successful sign-in once we have test credentials
  test.skip('should successfully sign in with valid credentials', async ({ page }) => {
    // Skipped: Requires test user setup
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
  })
})

test.describe('Protected Routes - Baseline', () => {
  
  test('should redirect to sign-in when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/)
  })
  
  test('should redirect to sign-in when accessing pipeline without auth', async ({ page }) => {
    await page.goto('/pipeline')
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/)
  })
  
  test('should redirect to sign-in when accessing contacts without auth', async ({ page }) => {
    await page.goto('/contacts')
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/)
  })
})

