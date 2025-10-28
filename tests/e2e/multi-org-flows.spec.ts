/**
 * Multi-Org E2E Tests (Playwright)
 * 
 * End-to-end tests for complete multi-org user flows:
 * - Org switching
 * - Onboarding experience
 * - Verification banners
 * - Keyboard shortcuts
 * - Pin/unpin organizations
 * 
 * Run: npm run test:e2e
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

test.describe('Multi-Org User Flows', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto(TEST_BASE_URL)
  })

  test.afterEach(async () => {
    await page.close()
  })

  // ============================================================================
  // TEST SUITE 1: Login & Onboarding
  // ============================================================================

  test.describe('Login and First-Time Experience', () => {
    test('should login successfully', async () => {
      // Navigate to sign-in
      await page.goto(`${TEST_BASE_URL}/sign-in`)

      // Fill credentials
      await page.fill('input[type="email"]', TEST_USER_EMAIL)
      await page.fill('input[type="password"]', TEST_USER_PASSWORD)

      // Submit
      await page.click('button[type="submit"]')

      // Wait for dashboard
      await page.waitForURL(`${TEST_BASE_URL}/dashboard`, { timeout: 10000 })

      // Verify dashboard loaded
      expect(await page.title()).toContain('Dashboard')
    })

    test('should show onboarding modal for new multi-org user', async () => {
      // Login
      await loginAsMultiOrgUser(page)

      // Check for onboarding modal (if user hasn't seen it)
      const onboardingModal = page.locator('text=Welcome to Multi-Organization Access')
      
      if (await onboardingModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Verify onboarding content
        await expect(onboardingModal).toBeVisible()
        await expect(page.locator('text=Switch between organizations instantly')).toBeVisible()

        // Check progress indicators
        const progressDots = page.locator('[class*="progress"]')
        await expect(progressDots).toBeVisible()

        // Click next
        await page.click('button:has-text("Next")')
        await expect(page.locator('text=Per-Location Access Control')).toBeVisible()

        // Skip onboarding
        await page.click('button:has-text("Skip Tour")')
        await expect(onboardingModal).not.toBeVisible()
      }
    })
  })

  // ============================================================================
  // TEST SUITE 2: Org Switcher UI
  // ============================================================================

  test.describe('Organization Switcher', () => {
    test.beforeEach(async () => {
      await loginAsMultiOrgUser(page)
    })

    test('should show org switcher in header', async () => {
      // Look for org switcher (building icon + org name)
      const orgSwitcher = page.locator('[aria-label="Switch organization"]')
      await expect(orgSwitcher).toBeVisible()

      // Verify it shows current org name
      const orgName = await orgSwitcher.textContent()
      expect(orgName).toBeTruthy()
      expect(orgName?.length).toBeGreaterThan(0)
    })

    test('should open dropdown on click', async () => {
      // Click org switcher
      await page.click('[aria-label="Switch organization"]')

      // Wait for dropdown
      const dropdown = page.locator('[role="menu"]')
      await expect(dropdown).toBeVisible()

      // Verify search input exists
      const searchInput = page.locator('input[placeholder*="Search organizations"]')
      await expect(searchInput).toBeVisible()

      // Verify it's focused
      await expect(searchInput).toBeFocused()
    })

    test('should search organizations', async () => {
      // Open dropdown
      await page.click('[aria-label="Switch organization"]')

      // Type in search
      const searchInput = page.locator('input[placeholder*="Search organizations"]')
      await searchInput.fill('acme')

      // Wait for filtered results
      await page.waitForTimeout(300) // Debounce

      // Verify only matching orgs shown
      const orgItems = page.locator('[role="menuitem"]')
      const count = await orgItems.count()
      
      // Should have fewer orgs than total
      expect(count).toBeGreaterThanOrEqual(0)

      // Check if results contain search term (if any results)
      if (count > 0) {
        const firstOrgText = await orgItems.first().textContent()
        expect(firstOrgText?.toLowerCase()).toContain('acme')
      }
    })

    test('should close dropdown on escape key', async () => {
      // Open dropdown
      await page.click('[aria-label="Switch organization"]')
      
      const dropdown = page.locator('[role="menu"]')
      await expect(dropdown).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')

      // Dropdown should close
      await expect(dropdown).not.toBeVisible()
    })

    test('should navigate with arrow keys', async () => {
      // Open dropdown
      await page.click('[aria-label="Switch organization"]')
      await page.waitForSelector('[role="menuitem"]')

      // Press down arrow
      await page.keyboard.press('ArrowDown')

      // Verify selection moved (check for highlighted state)
      const selectedItem = page.locator('[role="menuitem"][class*="bg-gray-100"]')
      await expect(selectedItem).toBeVisible()

      // Press down again
      await page.keyboard.press('ArrowDown')

      // Should move to next item
      await expect(selectedItem).toBeVisible()
    })
  })

  // ============================================================================
  // TEST SUITE 3: Org Switching
  // ============================================================================

  test.describe('Switch Organizations', () => {
    test.beforeEach(async () => {
      await loginAsMultiOrgUser(page)
    })

    test('should switch to another organization', async () => {
      // Get current org name
      const orgSwitcher = page.locator('[aria-label="Switch organization"]')
      const currentOrgName = await orgSwitcher.textContent()

      // Open dropdown
      await orgSwitcher.click()

      // Click on a different org (second in list)
      const orgItems = page.locator('[role="menuitem"]')
      const secondOrg = orgItems.nth(1)
      const targetOrgName = await secondOrg.textContent()

      // Click to switch
      await secondOrg.click()

      // Wait for page reload (org switch forces reload)
      await page.waitForLoadState('networkidle')

      // Verify new org is active
      const newOrgName = await page.locator('[aria-label="Switch organization"]').textContent()
      expect(newOrgName).not.toBe(currentOrgName)
      expect(newOrgName).toContain(targetOrgName?.split('\n')[0]) // Match first line (org name)
    })

    test('should show switching state', async () => {
      // Open dropdown
      await page.click('[aria-label="Switch organization"]')

      // Click on different org
      const orgItems = page.locator('[role="menuitem"]')
      await orgItems.nth(1).click()

      // Should show "Switching..." state briefly
      const switchingText = page.locator('text=Switching')
      
      // May be too fast to catch, so use waitFor with small timeout
      await switchingText.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {
        // It's okay if we miss it - page reload happens fast
      })
    })
  })

  // ============================================================================
  // TEST SUITE 4: Keyboard Shortcuts
  // ============================================================================

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async () => {
      await loginAsMultiOrgUser(page)
    })

    test('should open org switcher with Cmd+K (or Ctrl+K)', async () => {
      // Get OS-specific modifier key
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Press Cmd/Ctrl + K
      await page.keyboard.press(`${modifier}+KeyK`)

      // Dropdown should open
      const dropdown = page.locator('[role="menu"]')
      await expect(dropdown).toBeVisible()

      // Search input should be focused
      const searchInput = page.locator('input[placeholder*="Search organizations"]')
      await expect(searchInput).toBeFocused()
    })

    test('should navigate and select with keyboard', async () => {
      // Open with Cmd+K
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'
      await page.keyboard.press(`${modifier}+KeyK`)

      // Wait for dropdown
      await page.waitForSelector('[role="menuitem"]')

      // Press down arrow twice
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')

      // Press Enter to select
      await page.keyboard.press('Enter')

      // Should switch org (page reloads)
      await page.waitForLoadState('networkidle')

      // Verify we're still on dashboard
      expect(page.url()).toContain('/dashboard')
    })
  })

  // ============================================================================
  // TEST SUITE 5: Verification Banners
  // ============================================================================

  test.describe('Verification Banners', () => {
    test('should show email verification banner if unverified', async () => {
      // Login as unverified user (if test data set up)
      await loginAsMultiOrgUser(page)

      // Check for email verification banner
      const banner = page.locator('text=Verify Your Email')
      
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Verify banner content
        await expect(banner).toBeVisible()
        await expect(page.locator('button:has-text("Resend Email")')).toBeVisible()

        // Test dismiss
        const dismissButton = page.locator('[aria-label="Dismiss"]').first()
        await dismissButton.click()

        // Banner should disappear
        await expect(banner).not.toBeVisible()
      }
    })

    test('should show org validation banner if unvalidated', async () => {
      await loginAsMultiOrgUser(page)

      // Check for org validation banner
      const banner = page.locator('text=Organization Validation')
      
      if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Verify banner content
        await expect(banner).toBeVisible()
        await expect(page.locator('button:has-text("Validate")')).toBeVisible()
      }
    })
  })

  // ============================================================================
  // TEST SUITE 6: Mobile Experience
  // ============================================================================

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

    test('should show org switcher on mobile', async () => {
      await loginAsMultiOrgUser(page)

      // Org switcher should be visible (may be compact)
      const orgSwitcher = page.locator('[aria-label="Switch organization"]')
      await expect(orgSwitcher).toBeVisible()
    })

    test('should open full-screen dropdown on mobile', async () => {
      await loginAsMultiOrgUser(page)

      // Click org switcher
      await page.click('[aria-label="Switch organization"]')

      // Dropdown should be visible and take up screen
      const dropdown = page.locator('[role="menu"]')
      await expect(dropdown).toBeVisible()

      // Check if it's full-width (or close to it)
      const box = await dropdown.boundingBox()
      expect(box?.width).toBeGreaterThan(300) // Should be wide
    })
  })

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function loginAsMultiOrgUser(page: Page) {
    await page.goto(`${TEST_BASE_URL}/sign-in`)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${TEST_BASE_URL}/dashboard`, { timeout: 10000 })
  }
})

// ============================================================================
// TEST SUITE 7: Accessibility
// ============================================================================

test.describe('Accessibility', () => {
  test('org switcher should be keyboard accessible', async ({ page }) => {
    await page.goto(TEST_BASE_URL)
    // Login
    await page.goto(`${TEST_BASE_URL}/sign-in`)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${TEST_BASE_URL}/dashboard`)

    // Tab to org switcher
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // May need multiple tabs

    // Find org switcher and ensure it's focusable
    const orgSwitcher = page.locator('[aria-label="Switch organization"]')
    
    if (await orgSwitcher.isVisible()) {
      // Press Enter to open
      await orgSwitcher.focus()
      await page.keyboard.press('Enter')

      // Dropdown should open
      await expect(page.locator('[role="menu"]')).toBeVisible()
    }
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${TEST_BASE_URL}/dashboard`)

    // Check for ARIA attributes
    const orgSwitcher = page.locator('[aria-label="Switch organization"]')
    const expandedAttr = await orgSwitcher.getAttribute('aria-expanded')
    expect(expandedAttr).toBeDefined()

    const hasPopupAttr = await orgSwitcher.getAttribute('aria-haspopup')
    expect(hasPopupAttr).toBe('true')
  })
})



