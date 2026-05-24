#!/usr/bin/env node
/**
 * End-to-end walkthrough of the CRM as a reception person + admin.
 *
 * Reads credentials from .claude/test-credentials.json (gitignored).
 * Hits production. Captures screenshots at every major checkpoint into
 * tmp/e2e-walkthrough/. Reports a clean pass/fail table at the end.
 *
 * Each checkpoint is independent: a failure logs and continues so
 * later steps still get exercised. Final exit code is non-zero if any
 * checkpoint failed.
 */

import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const creds = JSON.parse(readFileSync('.claude/test-credentials.json', 'utf8'))
const BASE = creds.test_account?.url
const EMAIL = creds.test_account?.email
const PASSWORD = creds.test_account?.password

if (!BASE || !EMAIL || !PASSWORD) {
  console.error('Missing test_account in .claude/test-credentials.json')
  process.exit(2)
}

const SHOTS = 'tmp/e2e-walkthrough'
const results = []

async function checkpoint(name, fn, page) {
  const safeName = name.replace(/[^a-z0-9-]/gi, '_').toLowerCase()
  process.stdout.write(`▶ ${name}…`)
  try {
    await fn()
    if (page) await page.screenshot({ path: `${SHOTS}/${safeName}.png`, fullPage: false })
    results.push({ name, status: 'PASS' })
    console.log(' \x1b[32mPASS\x1b[0m')
  } catch (err) {
    if (page) {
      try {
        await page.screenshot({ path: `${SHOTS}/${safeName}_FAIL.png`, fullPage: false })
      } catch {
        /* page might be in a bad state */
      }
    }
    results.push({ name, status: 'FAIL', error: err.message })
    console.log(' \x1b[31mFAIL\x1b[0m —', err.message.split('\n')[0].slice(0, 120))
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  // Pretend to be a normal desktop. Skip headless detection signals.
})
const page = await context.newPage()
// Reduce console noise but capture errors for diagnostics.
page.on('pageerror', (err) => console.warn('  [pageerror]', err.message.slice(0, 200)))

try {
  // ---------------------------------------------------------------
  // 1. Sign in
  // ---------------------------------------------------------------
  await checkpoint('Open sign-in page', async () => {
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[type=email]', { timeout: 15000 })
  }, page)

  await checkpoint('Submit credentials', async () => {
    await page.fill('input[type=email]', EMAIL)
    await page.fill('input[type=password]', PASSWORD)
    await Promise.all([
      page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 30000 }),
      page.click('button[type=submit]'),
    ])
  }, page)

  // ---------------------------------------------------------------
  // 2. Dashboard
  // ---------------------------------------------------------------
  await checkpoint('Dashboard loads with triage lanes', async () => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    // Wait for either a known lane or the metric strip.
    await page.waitForSelector('text=/Priorities|Calls|Replies|New|Stale|Today/i', { timeout: 20000 })
  }, page)

  // ---------------------------------------------------------------
  // 3. Contacts
  // ---------------------------------------------------------------
  await checkpoint('Contacts list loads', async () => {
    await page.goto(`${BASE}/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Contacts|Add|Joey|Search/i', { timeout: 15000 })
  }, page)

  await checkpoint('Open Joey Baby contact detail', async () => {
    // Look for the known multi-deal test contact.
    const link = page.getByText(/Joey Baby/i).first()
    await link.waitFor({ state: 'visible', timeout: 10000 })
    await link.click()
    await page.waitForSelector('text=/Joey Baby/i', { timeout: 15000 })
  }, page)

  // ---------------------------------------------------------------
  // 4. Tasks
  // ---------------------------------------------------------------
  await checkpoint('Tasks page loads', async () => {
    await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Tasks|Start Queue|My tasks|All/i', { timeout: 15000 })
  }, page)

  await checkpoint('Create Task slide-over opens', async () => {
    // Find a "+" or "Create" or "Add task" button.
    const btn = page.getByRole('button', { name: /add task|create task|new task|\+ ?task/i }).first()
    if ((await btn.count()) > 0) {
      await btn.click()
    } else {
      // Try a generic "+" icon button.
      const plus = page.getByRole('button', { name: /^\+$|plus/i }).first()
      await plus.click()
    }
    await page.waitForSelector('text=/Create New Task|Task Title|Title \\*/i', { timeout: 10000 })
  }, page)

  await checkpoint('Recurring section visible in Create Task', async () => {
    await page.waitForSelector('text=/Repeat this task/i', { timeout: 5000 })
  }, page)

  await checkpoint('Close Create Task without submitting', async () => {
    const cancel = page.getByRole('button', { name: /cancel/i }).first()
    await cancel.click()
    await page.waitForSelector('text=/Create New Task/i', { state: 'detached', timeout: 5000 })
  }, page)

  // ---------------------------------------------------------------
  // 5. Settings → Notifications
  // ---------------------------------------------------------------
  await checkpoint('Settings → Communications → Notifications Basic tab', async () => {
    await page.goto(`${BASE}/settings?section=communications&tab=notifications`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Browser notifications|Morning task digest/i', { timeout: 15000 })
  }, page)

  await checkpoint('Notifications Advanced sub-tab', async () => {
    const tab = page.getByRole('tab', { name: /advanced/i }).first()
    if ((await tab.count()) > 0) await tab.click()
    await page.waitForSelector('text=/Channels|Quiet hours/i', { timeout: 10000 })
  }, page)

  await checkpoint('Notifications Policies sub-tab (admin)', async () => {
    const tab = page.getByRole('tab', { name: /policies/i }).first()
    if ((await tab.count()) === 0) throw new Error('Policies tab not rendered')
    await tab.click()
    await page.waitForSelector('text=/Retention|Manager-overdue|Rate limit|Admin or owner role required/i', { timeout: 10000 })
  }, page)

  // ---------------------------------------------------------------
  // 6. Settings → Team
  // ---------------------------------------------------------------
  await checkpoint('Settings → Team Members loads roster', async () => {
    await page.goto(`${BASE}/settings?section=team&tab=members`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Team Members|Current Team|Invite/i', { timeout: 15000 })
  }, page)

  await checkpoint('Settings → Practice Groups tab loads', async () => {
    const tab = page.getByRole('tab', { name: /practice groups|groups/i }).first()
    if ((await tab.count()) > 0) {
      await tab.click()
    } else {
      await page.goto(`${BASE}/settings?section=team&tab=groups`, { waitUntil: 'domcontentloaded' })
    }
    await page.waitForSelector('text=/Practice groups|Front Desk|Default assignee|Add group/i', { timeout: 15000 })
  }, page)

  // ---------------------------------------------------------------
  // 7. Pipeline / Deals
  // ---------------------------------------------------------------
  await checkpoint('Pipeline page loads', async () => {
    await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Pipeline|Kanban|New|Stage|deals?/i', { timeout: 15000 })
  }, page)

  // ---------------------------------------------------------------
  // 8. Sidebar regression: /reception should NOT exist (2b.68 removed)
  // ---------------------------------------------------------------
  await checkpoint('/reception is gone (404)', async () => {
    const res = await page.goto(`${BASE}/reception`, { waitUntil: 'domcontentloaded' })
    const status = res?.status() ?? 0
    const body = await page.content()
    // It's a Next.js client app — server returns 200 with the 404 component.
    // Look for "404" or "not found" text.
    const isNotFound = /404|not found|page not found/i.test(body)
    if (!isNotFound && status !== 404) {
      throw new Error(`Expected 404, page rendered fine (status ${status})`)
    }
  }, page)

  // ---------------------------------------------------------------
  // 9. Call coaching (kept as standalone workspace per 2b.68)
  // ---------------------------------------------------------------
  await checkpoint('Call Coaching workspace loads', async () => {
    await page.goto(`${BASE}/call-coaching`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Coaching|Workspace|Call/i', { timeout: 15000 })
  }, page)

  // ---------------------------------------------------------------
  // 10. Automations sidebar
  // ---------------------------------------------------------------
  await checkpoint('Automations page loads', async () => {
    await page.goto(`${BASE}/automations`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Automations|Workflows|Playbook|Create/i', { timeout: 15000 })
  }, page)
} finally {
  await browser.close()
}

// ---------------------------------------------------------------
// Report
// ---------------------------------------------------------------
console.log('\n=== Walkthrough Report ===')
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)
for (const r of results) {
  const color = r.status === 'PASS' ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${r.status}\x1b[0m  ${pad(r.name, 60)}  ${r.error ? '— ' + r.error.slice(0, 80) : ''}`)
}
const passed = results.filter((r) => r.status === 'PASS').length
const failed = results.filter((r) => r.status === 'FAIL').length
console.log(`\nTotal: ${passed} passed, ${failed} failed (${results.length} checkpoints)`)
console.log(`Screenshots: ${SHOTS}/`)
process.exit(failed > 0 ? 1 : 0)
