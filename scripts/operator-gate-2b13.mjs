#!/usr/bin/env node
/**
 * Phase 2b.13 — Practice Brain operator gate (agent-handleable).
 *
 * Logs into the CRM with the test account, navigates to
 * Settings → AI & Automation → Practice Brain, saves a unique
 * brand_voice value, and prints it to stdout so the calling agent
 * can verify the DB row.
 *
 * Usage:  node scripts/operator-gate-2b13.mjs
 *
 * The brand_voice value is unique-per-run (includes a timestamp) so
 * the verification SQL can find the row we just wrote even if the
 * test tenant already had a previous brand_voice from another run.
 */

import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const credsPath = new URL('../.claude/test-credentials.json', import.meta.url)
const creds = JSON.parse(readFileSync(credsPath, 'utf8'))
const { url: baseUrl, email, password } = creds.test_account

if (!baseUrl || !email || !password) {
  console.error('test_account.{url,email,password} missing in .claude/test-credentials.json')
  process.exit(1)
}

const RUN_TAG = `2b.13 op-gate ${new Date().toISOString()}`
const BRAND_VOICE = `Warm, professional, never use 'dear sir/madam'. [${RUN_TAG}]`

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()

const log = (msg) => console.log(`[op-gate] ${msg}`)

try {
  log(`navigating to ${baseUrl}/sign-in`)
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded' })

  log('filling sign-in form')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)

  log('submitting')
  await Promise.all([
    page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 30_000 }),
    page.locator('button[type="submit"]:has-text("Sign in")').click(),
  ])
  log(`landed on ${page.url()}`)

  const settingsUrl = `${baseUrl}/settings?section=ai&tab=practice-brain`
  log(`navigating to ${settingsUrl}`)
  await page.goto(settingsUrl, { waitUntil: 'domcontentloaded' })

  // settings-tabs.tsx hardcodes ai-tab default to 'ai-assistant' regardless
  // of URL; click the Practice Brain TabsTrigger to switch.
  log('clicking Practice Brain tab trigger')
  const tabTrigger = page.getByRole('tab', { name: 'Practice Brain' })
  await tabTrigger.waitFor({ timeout: 30_000 })
  await tabTrigger.click()

  log('waiting for Practice Brain tab to render')
  await page.locator('[data-testid="practice-brain-tab"]').waitFor({ timeout: 30_000 })

  const brandVoice = page.locator(
    'textarea[placeholder*="Warm, conversational, and reassuring"]'
  )
  await brandVoice.waitFor({ timeout: 10_000 })

  log(`filling brand_voice with: ${BRAND_VOICE}`)
  await brandVoice.fill(BRAND_VOICE)

  const saveBtn = page.locator('button:has-text("Save Practice Brain")')
  await saveBtn.waitFor({ timeout: 10_000 })

  log('waiting for Save button to enable')
  await saveBtn.evaluate((el) => {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const tick = () => {
        if (!el.hasAttribute('disabled')) return resolve(true)
        if (Date.now() - start > 8000) return reject(new Error('save button stayed disabled'))
        setTimeout(tick, 100)
      }
      tick()
    })
  })

  log('clicking Save Practice Brain')
  const patchResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/settings/practice-brain') && resp.request().method() === 'PATCH',
    { timeout: 30_000 }
  )
  await saveBtn.click()

  const patchResponse = await patchResponsePromise
  log(`PATCH /api/settings/practice-brain → ${patchResponse.status()}`)
  if (patchResponse.status() < 200 || patchResponse.status() >= 300) {
    const body = await patchResponse.text().catch(() => '<unreadable>')
    throw new Error(`PATCH failed: ${patchResponse.status()} ${body}`)
  }

  log('SUCCESS')
  console.log(JSON.stringify({ ok: true, brand_voice: BRAND_VOICE, run_tag: RUN_TAG }))
} catch (err) {
  console.error('[op-gate] FAILED:', err?.message || err)
  await page.screenshot({ path: 'scripts/operator-gate-2b13-failure.png', fullPage: true }).catch(() => {})
  console.log(JSON.stringify({ ok: false, error: String(err?.message || err) }))
  process.exitCode = 1
} finally {
  await browser.close().catch(() => {})
}
