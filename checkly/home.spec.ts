/**
 * Checkly Browser Check: Homepage Spec
 * 
 * Playwright test that verifies homepage loads and renders correctly
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/'

test('Homepage loads successfully', async ({ page }) => {
  // Navigate to homepage
  await page.goto(BASE_URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  
  // Wait for page to be visible
  await page.waitForTimeout(2000)
  
  // Check that the page has loaded (look for body or main element)
  const mainElement = page.locator('main, [role="main"], body, #__next')
  await expect(mainElement.first()).toBeVisible({ timeout: 10000 })
  
  // Check page title contains expected text
  await expect(page).toHaveTitle(/Dental CRM|Home|Sign In/i)
  
  // Take a screenshot for visual verification
  await page.screenshot({ 
    path: 'homepage.png',
    fullPage: false 
  })
  
  console.log('✅ Homepage loaded successfully')
  console.log(`URL: ${page.url()}`)
  console.log(`Title: ${await page.title()}`)
})

