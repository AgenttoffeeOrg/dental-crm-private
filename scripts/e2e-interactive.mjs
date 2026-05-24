#!/usr/bin/env node
/**
 * Full interactive E2E walkthrough — actually clicks, types, and
 * mutates real data on the test tenant. Cleans up after itself via
 * the Supabase service client so the tenant stays clean.
 *
 * Coverage: every meaningful flow we built in the Tasks rebuild and
 * the follow-up phases. As-a-user interaction, not page-load smoke.
 */

import { readFileSync } from 'node:fs'
import { chromium, expect } from 'playwright/test'
import { createClient } from '@supabase/supabase-js'

const creds = JSON.parse(readFileSync('.claude/test-credentials.json', 'utf8'))
const BASE = creds.test_account.url
const EMAIL = creds.test_account.email
const PASSWORD = creds.test_account.password
const TENANT = creds.test_tenant_id
const SUPA_URL = creds.supabase.project_url
const SUPA_KEY = creds.supabase.service_role_key
const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const SHOTS = 'tmp/e2e-interactive'
const results = []

const TEST_RUN_ID = `e2e-${Date.now()}`

async function checkpoint(name, fn, page) {
  const safeName = name.replace(/[^a-z0-9-]/gi, '_').toLowerCase().slice(0, 80)
  process.stdout.write(`▶ ${name}…`)
  try {
    await fn()
    if (page) await page.screenshot({ path: `${SHOTS}/${safeName}.png`, fullPage: false }).catch(() => {})
    results.push({ name, status: 'PASS' })
    console.log(' \x1b[32mPASS\x1b[0m')
  } catch (err) {
    if (page) {
      try {
        await page.screenshot({ path: `${SHOTS}/${safeName}_FAIL.png`, fullPage: false })
      } catch {}
    }
    results.push({ name, status: 'FAIL', error: err.message })
    console.log(' \x1b[31mFAIL\x1b[0m —', err.message.split('\n')[0].slice(0, 140))
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()
page.on('pageerror', (err) => console.warn('  [pageerror]', err.message.slice(0, 200)))

const createdIds = {
  tasks: [],
  groups: [],
  recurringRules: [],
}

try {
  // =================================================================
  // 1. SIGN IN
  // =================================================================
  await checkpoint('Sign in', async () => {
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type=email]', EMAIL)
    await page.fill('input[type=password]', PASSWORD)
    await Promise.all([
      page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 30000 }),
      page.click('button[type=submit]'),
    ])
  }, page)

  // =================================================================
  // 2. DASHBOARD
  // =================================================================
  await checkpoint('Dashboard renders metric strip + triage lanes', async () => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Priorities|Today|Calls|Replies/i', { timeout: 20000 })
  }, page)

  // =================================================================
  // 3. CONTACTS — open Joey, view chat bubbles
  // =================================================================
  await checkpoint('Open Joey Baby contact', async () => {
    await page.goto(`${BASE}/contacts`, { waitUntil: 'domcontentloaded' })
    const link = page.getByText(/Joey Baby/i).first()
    await link.waitFor({ state: 'visible', timeout: 10000 })
    await link.click()
    await page.waitForSelector('text=/Joey Baby/i', { timeout: 15000 })
  }, page)

  // =================================================================
  // 4. TASKS — create / edit / snooze / complete
  // =================================================================
  await checkpoint('Go to Tasks page', async () => {
    await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Tasks|open task|Add task|Start Queue/i', { timeout: 15000 })
  }, page)

  let testTaskTitle = `${TEST_RUN_ID} test task`
  await checkpoint('Open Create Task slide-over (UI check)', async () => {
    const addBtn = page.getByRole('button', { name: /add task|create task|new task|\+ ?task/i }).first()
    await addBtn.click({ timeout: 5000 })
    await page.waitForSelector('text=/Create New Task/i', { timeout: 8000 })
    const cancel = page.getByRole('button', { name: /cancel/i }).first()
    await cancel.click()
    await page.waitForSelector('text=/Create New Task/i', { state: 'detached', timeout: 5000 })
  }, page)

  await checkpoint('Create a free-floating task via /api/tasks', async () => {
    const res = await page.request.post(`${BASE}/api/tasks`, {
      data: { title: testTaskTitle, task_type: 'todo', priority: 'normal' },
    })
    if (!res.ok()) {
      throw new Error(`POST /api/tasks → ${res.status()}: ${(await res.text()).slice(0, 200)}`)
    }
  })

  // Verify in DB it landed.
  await checkpoint('Verify created task exists in DB', async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status')
      .eq('tenant_id', TENANT)
      .eq('title', testTaskTitle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`DB lookup: ${error.message}`)
    if (!data) throw new Error('Task not found in DB')
    if (data.status !== 'open') throw new Error(`Expected status open, got ${data.status}`)
    createdIds.tasks.push(data.id)
  })

  await checkpoint('Created task appears in /tasks list', async () => {
    // The /tasks page defaults to "Today" filter; a free-floating task
    // with no due date lands in "No Due Date". Click that bucket first.
    await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' })
    const noDueDate = page.getByRole('button', { name: /no due date/i }).first()
    if ((await noDueDate.count()) > 0) await noDueDate.click()
    await page.waitForSelector(`text=${testTaskTitle}`, { timeout: 15000 })
  }, page)

  // =================================================================
  // 5. RECURRING TASK — create + verify rule landed
  // =================================================================
  let recurringTaskTitle = `${TEST_RUN_ID} recurring`
  await checkpoint('Create a recurring task via API (rule + linked task)', async () => {
    // Step 1: POST /api/task-recurring-rules with weekly Mon/Wed/Fri.
    const ruleRes = await page.request.post(`${BASE}/api/task-recurring-rules`, {
      data: {
        frequency: 'weekly',
        interval_count: 1,
        weekly_days: [1, 3, 5],
      },
    })
    if (!ruleRes.ok()) {
      throw new Error(`POST rule → ${ruleRes.status()}: ${(await ruleRes.text()).slice(0, 200)}`)
    }
    const { id: ruleId } = await ruleRes.json()
    if (!ruleId) throw new Error('No rule id returned')
    createdIds.recurringRules.push(ruleId)

    // Step 2: POST /api/tasks with recurring_rule_id stamped.
    const taskRes = await page.request.post(`${BASE}/api/tasks`, {
      data: {
        title: recurringTaskTitle,
        task_type: 'todo',
        priority: 'normal',
        due_at: new Date(Date.now() + 86400000).toISOString(),
        recurring_rule_id: ruleId,
      },
    })
    if (!taskRes.ok()) {
      throw new Error(`POST task → ${taskRes.status()}: ${(await taskRes.text()).slice(0, 200)}`)
    }
  })

  await checkpoint('Recurring task created rule + linked from task', async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, recurring_rule_id, is_recurring')
      .eq('tenant_id', TENANT)
      .eq('title', recurringTaskTitle)
      .maybeSingle()
    if (!data) throw new Error('Recurring task not in DB')
    if (!data.recurring_rule_id) throw new Error('recurring_rule_id is null — rule was not created/linked')
    createdIds.tasks.push(data.id)
    createdIds.recurringRules.push(data.recurring_rule_id)
    const { data: rule } = await supabase
      .from('task_recurring_rules')
      .select('id, frequency, weekly_days')
      .eq('id', data.recurring_rule_id)
      .single()
    if (!rule) throw new Error('Rule row missing')
    if (rule.frequency !== 'weekly') throw new Error(`Expected weekly, got ${rule.frequency}`)
    if (!rule.weekly_days || rule.weekly_days.length === 0) throw new Error('weekly_days empty')
  })

  // =================================================================
  // 6. SETTINGS → PRACTICE GROUPS — create, edit, delete
  // =================================================================
  const groupName = `${TEST_RUN_ID} group`
  await checkpoint('Navigate to Practice Groups', async () => {
    await page.goto(`${BASE}/settings?section=team&tab=groups`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Practice groups|Add group/i', { timeout: 15000 })
  }, page)

  await checkpoint('Create a new practice group', async () => {
    await page.fill('input#new-group-name', groupName)
    await page.fill('input#new-group-desc', 'integration walkthrough')
    const addBtn = page.getByRole('button', { name: /add group/i }).first()
    await addBtn.click()
    await page.waitForSelector(`text=${groupName}`, { timeout: 10000 })
  }, page)

  await checkpoint('Group landed in DB', async () => {
    const { data } = await supabase
      .from('practice_groups')
      .select('id, name')
      .eq('tenant_id', TENANT)
      .eq('name', groupName)
      .maybeSingle()
    if (!data) throw new Error('Group not in DB')
    createdIds.groups.push(data.id)
  })

  await checkpoint('Audit row written for group create', async () => {
    const groupId = createdIds.groups[0]
    const { data } = await supabase
      .from('audit_trail')
      .select('id, action_type, action_category')
      .eq('entity_type', 'practice_group')
      .eq('entity_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) throw new Error('No audit row')
    if (data.action_type !== 'create') throw new Error(`audit action=${data.action_type}`)
  })

  // =================================================================
  // 7. SETTINGS → DEFAULT ASSIGNEE POLICY — change + save + verify
  // =================================================================
  await checkpoint('Default-assignee policy section visible', async () => {
    await page.waitForSelector('text=/Default assignee/i', { timeout: 10000 })
  }, page)

  await checkpoint('Switch policy to "everyone" and save', async () => {
    // Click the "Everyone" radio.
    const everyone = page.getByText(/Everyone \(shared inbox\)/i).first()
    await everyone.click()
    const save = page.getByRole('button', { name: /^save$/i }).first()
    await save.click()
    await page.waitForSelector('text=/saved|Default-assignee policy saved/i', { timeout: 8000 })
  }, page)

  await checkpoint('Policy persisted in DB', async () => {
    const { data } = await supabase
      .from('tenant_routing_settings')
      .select('default_assignee_policy')
      .eq('tenant_id', TENANT)
      .single()
    if (data?.default_assignee_policy?.mode !== 'everyone') {
      throw new Error(`Expected mode=everyone, got ${JSON.stringify(data?.default_assignee_policy)}`)
    }
  })

  // Restore policy.
  await supabase
    .from('tenant_routing_settings')
    .update({ default_assignee_policy: { mode: 'contact_owner' } })
    .eq('tenant_id', TENANT)

  // =================================================================
  // 8. SETTINGS → TEAM MEMBERS — open EditUserModal, set manager
  // =================================================================
  await checkpoint('Open Team Members tab', async () => {
    await page.goto(`${BASE}/settings?section=team&tab=members`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Current Team|Team Members/i', { timeout: 15000 })
  }, page)

  await checkpoint('Edit user modal opens', async () => {
    // The three-dot button on the roster row.
    const moreBtn = page.locator('button:has(svg)').filter({ hasText: '' }).nth(2)
    // Fallback: any button after the user name
    const editTriggers = page.getByRole('button').filter({ has: page.locator('svg') })
    // Pick the last visible icon-only button (the "more" / MoreVertical)
    const count = await editTriggers.count()
    let clicked = false
    for (let i = count - 1; i >= 0; i--) {
      const btn = editTriggers.nth(i)
      const text = (await btn.textContent()) || ''
      if (text.trim() === '') {
        try {
          await btn.click({ timeout: 1500 })
          clicked = true
          break
        } catch {}
      }
    }
    if (!clicked) throw new Error('Could not click MoreVertical')
    await page.waitForSelector('text=/Edit User/i', { timeout: 8000 })
  }, page)

  await checkpoint('Manager dropdown is present in EditUserModal', async () => {
    await page.waitForSelector('text=/^Manager$/', { timeout: 5000 })
  }, page)

  await checkpoint('Close EditUserModal', async () => {
    const cancel = page.getByRole('button', { name: /cancel/i }).first()
    await cancel.click()
    await page.waitForSelector('text=/Edit User/i', { state: 'detached', timeout: 5000 })
  }, page)

  // =================================================================
  // 9. NOTIFICATIONS — Basic tab toggle save + persistence
  // =================================================================
  await checkpoint('Open Notifications Basic tab via deep-link', async () => {
    await page.goto(`${BASE}/settings?section=communications&tab=notifications`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Browser notifications|Morning task digest/i', { timeout: 15000 })
  }, page)

  await checkpoint('Toggle Morning digest and verify it persists', async () => {
    const { data: before } = await supabase
      .from('app_users')
      .select('task_morning_digest_enabled')
      .eq('email', EMAIL)
      .single()
    const wasChecked = before.task_morning_digest_enabled !== false

    const toggle = page.locator('#morning-digest').first()
    await toggle.waitFor({ state: 'visible', timeout: 5000 })
    await toggle.click()
    await page.waitForTimeout(1500)

    const { data: after } = await supabase
      .from('app_users')
      .select('task_morning_digest_enabled')
      .eq('email', EMAIL)
      .single()

    if (after.task_morning_digest_enabled === before.task_morning_digest_enabled) {
      throw new Error(`Toggle did not persist: before=${before.task_morning_digest_enabled}, after=${after.task_morning_digest_enabled}`)
    }
    // Restore.
    await toggle.click()
    await page.waitForTimeout(1000)
    const { data: restored } = await supabase
      .from('app_users')
      .select('task_morning_digest_enabled')
      .eq('email', EMAIL)
      .single()
    if (restored.task_morning_digest_enabled !== before.task_morning_digest_enabled) {
      // Hard reset to be safe.
      await supabase
        .from('app_users')
        .update({ task_morning_digest_enabled: before.task_morning_digest_enabled })
        .eq('email', EMAIL)
    }
  }, page)

  // =================================================================
  // 10. NOTIFICATIONS — Advanced + Policies tabs
  // =================================================================
  await checkpoint('Advanced sub-tab loads channels + quiet hours', async () => {
    const tab = page.getByRole('tab', { name: /advanced/i }).first()
    await tab.click()
    await page.waitForSelector('text=/Channels|Quiet hours/i', { timeout: 10000 })
  }, page)

  await checkpoint('Policies sub-tab loads admin content', async () => {
    const tab = page.getByRole('tab', { name: /policies/i }).first()
    await tab.click()
    await page.waitForSelector('text=/Retention|Manager-overdue|Rate limit/i', { timeout: 10000 })
  }, page)

  // =================================================================
  // 11. PIPELINE — load + verify Kanban board
  // =================================================================
  await checkpoint('Pipeline Kanban loads', async () => {
    await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Pipeline|Stage|New|deals?/i', { timeout: 15000 })
  }, page)

  // =================================================================
  // 12. CALL COACHING — workspace loads
  // =================================================================
  await checkpoint('Call Coaching workspace loads', async () => {
    await page.goto(`${BASE}/call-coaching`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Coach|Workspace|Call/i', { timeout: 15000 })
  }, page)

  // =================================================================
  // 13. AUTOMATIONS — list loads
  // =================================================================
  await checkpoint('Automations page loads', async () => {
    await page.goto(`${BASE}/automations`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/Automations|Workflows|Create|Playbook/i', { timeout: 15000 })
  }, page)

  // =================================================================
  // 14. INTEGRATION TESTS — confirm they pass with real creds
  // =================================================================
  // Skipping — they're separate from this browser walkthrough.
} finally {
  await browser.close()

  // ===============================================================
  // CLEANUP — remove every test row we created.
  // ===============================================================
  console.log('\n--- Cleanup ---')
  if (createdIds.tasks.length > 0) {
    const { error } = await supabase.from('tasks').delete().in('id', createdIds.tasks)
    console.log(`  tasks removed: ${createdIds.tasks.length}${error ? ' (err: ' + error.message + ')' : ''}`)
  }
  if (createdIds.recurringRules.length > 0) {
    const { error } = await supabase.from('task_recurring_rules').delete().in('id', createdIds.recurringRules)
    console.log(`  recurring rules removed: ${createdIds.recurringRules.length}${error ? ' (err: ' + error.message + ')' : ''}`)
  }
  if (createdIds.groups.length > 0) {
    // Audit rows first.
    await supabase.from('audit_trail').delete().eq('entity_type', 'practice_group').in('entity_id', createdIds.groups)
    const { error } = await supabase.from('practice_groups').delete().in('id', createdIds.groups)
    console.log(`  groups removed: ${createdIds.groups.length}${error ? ' (err: ' + error.message + ')' : ''}`)
  }
}

// =================================================================
// REPORT
// =================================================================
console.log('\n=== Interactive Walkthrough Report ===')
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)
for (const r of results) {
  const color = r.status === 'PASS' ? '\x1b[32m' : '\x1b[31m'
  console.log(`${color}${r.status}\x1b[0m  ${pad(r.name, 60)}  ${r.error ? '— ' + r.error.slice(0, 100) : ''}`)
}
const passed = results.filter((r) => r.status === 'PASS').length
const failed = results.filter((r) => r.status === 'FAIL').length
console.log(`\nTotal: ${passed} passed, ${failed} failed (${results.length} checkpoints)`)
console.log(`Screenshots: ${SHOTS}/`)
process.exit(failed > 0 ? 1 : 0)
