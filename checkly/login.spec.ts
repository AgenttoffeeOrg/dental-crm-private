/**
 * Checkly Browser Check: Login Flow Spec
 * 
 * Playwright test that verifies users can log in successfully
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/'
const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

test('User can log in successfully', async ({ page }) => {
  // Navigate to login page
  const loginUrl = `${BASE_URL}/login`
  await page.goto(loginUrl, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  
  console.log(`Navigating to: ${loginUrl}`)
  
  // Wait for login form to load
  await page.waitForTimeout(2000)
  
  // Find and fill email input
  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first()
  await expect(emailInput).toBeVisible({ timeout: 10000 })
  await emailInput.fill(TEST_EMAIL)
  
  console.log(`✅ Filled email: ${TEST_EMAIL}`)
  
  // Find and fill password input
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await expect(passwordInput).toBeVisible()
  await passwordInput.fill(TEST_PASSWORD)
  
  console.log('✅ Filled password')
  
  // Find and click submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first()
  await expect(submitButton).toBeVisible()
  
  // Take screenshot before login
  await page.screenshot({ 
    path: 'login-form.png',
    fullPage: false 
  })
  
  await submitButton.click()
  
  console.log('✅ Clicked submit button')
  
  // Wait for navigation after login (should redirect to dashboard)
  await page.waitForTimeout(3000)
  
  // Verify we're on a logged-in page (dashboard, home, etc.)
  const currentUrl = page.url()
  expect(currentUrl).not.toContain('/login')
  expect(currentUrl).toMatch(/\/(dashboard|home|contacts|deals|pipeline)/i)
  
  console.log(`✅ Redirected to: ${currentUrl}`)
  
  // Verify logged-in content is visible
  const loggedInContent = page.locator('main, [role="main"], nav, header')
  await expect(loggedInContent.first()).toBeVisible({ timeout: 10000 })
  
  // Take screenshot after successful login
  await page.screenshot({ 
    path: 'logged-in.png',
    fullPage: false 
  })
  
  console.log('✅ Login successful')
})

