#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const creds = JSON.parse(readFileSync('.claude/test-credentials.json', 'utf8'))
const browser = await chromium.launch({ headless: true })
const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage())

await page.goto(`${creds.test_account.url}/sign-in`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type=email]', creds.test_account.email)
await page.fill('input[type=password]', creds.test_account.password)
await Promise.all([
  page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 30000 }),
  page.click('button[type=submit]'),
])
await page.goto(`${creds.test_account.url}/tasks`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
// Click the "All Tasks" chip (it shows count 51)
await page.getByText(/^All Tasks$/).first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'tmp/e2e-interactive/all_tasks_list.png', fullPage: false })
// Click the first row title
const firstTitle = page.locator('h4').filter({ hasText: /\S/ }).first()
await firstTitle.waitFor({ state: 'visible', timeout: 10000 })
await firstTitle.click()
await page.waitForTimeout(2500)
await page.screenshot({ path: 'tmp/e2e-interactive/after_row_click_send_buttons.png', fullPage: false })
console.log('captured')
await browser.close()
