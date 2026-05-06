/* global describe, it, expect */
/**
 * Phase 2a.5 — Regression tests for the automation/notification redirect.
 *
 * Covers the five Outcome-A / Outcome-B sites in `src/lib/automations/*` that
 * were rewired from raw `.from('notifications').insert()` (with broken
 * event_type/event_data/channel columns) to `emitNotification()`:
 *
 *   1. task-automation-actions.ts:task.overdue    (Outcome A)
 *   2. task-automation-actions.ts:task.escalated  (Outcome B — new event)
 *   3. task-automation-actions.ts:task.due_soon   (Outcome A)
 *   4. task-automation-actions.ts:task.assigned   (reused for auto-reassign)
 *   5. automation-governance.ts:automation.approval_requested (Outcome B)
 *   6. automation-governance.ts:automation.approval_reviewed  (Outcome B)
 *
 * Sites 1 and 6 in notifications_audit.md §3 (sendDealNotification,
 * notifyPipelineOwner) were Outcome C — deleted as dead code; they have no
 * test because they no longer exist.
 *
 * The tests here don't exercise the full Supabase client wiring — they
 * assert the event-catalog contract (the redirect targets exist) and that
 * the shape of the new events matches what the router expects. Full
 * integration coverage belongs in a future automation-test harness.
 */

import { getEventDefinition } from '../../notifications/event-catalog'

describe('Phase 2a.5 — automation notification redirect contracts', () => {
  describe('task events referenced by automation actions', () => {
    it('task.overdue exists and carries an assignee-targeted shape', () => {
      const def = getEventDefinition('task.overdue')
      expect(def).toBeDefined()
      expect(def?.module).toBe('tasks')
      expect(def?.default_audience).toBe('assignee')
    })

    it('task.escalated exists (new in 2a.5, Outcome B)', () => {
      const def = getEventDefinition('task.escalated')
      expect(def).toBeDefined()
      expect(def?.module).toBe('tasks')
      expect(def?.severity).toBe('error')
      expect(def?.priority).toBe('urgent')
      expect(def?.title_template).toMatch(/escalat/i)
    })

    it('task.due_soon exists and targets the assignee', () => {
      const def = getEventDefinition('task.due_soon')
      expect(def).toBeDefined()
      expect(def?.default_audience).toBe('assignee')
    })

    it('task.assigned exists and is the canonical assignment event', () => {
      // Auto-reassignment reuses task.assigned with metadata.reason set, so
      // this event must exist for the reassignment notify to work.
      const def = getEventDefinition('task.assigned')
      expect(def).toBeDefined()
      expect(def?.default_audience).toBe('assignee')
    })
  })

  describe('automation governance events (new in 2a.5, Outcome B)', () => {
    it('automation.approval_requested exists with the right shape', () => {
      const def = getEventDefinition('automation.approval_requested')
      expect(def).toBeDefined()
      expect(def?.module).toBe('system')
      expect(def?.severity).toBe('warning')
      expect(def?.priority).toBe('high')
      expect(def?.default_channels).toEqual(expect.arrayContaining(['in_app', 'email']))
    })

    it('automation.approval_reviewed exists with the right shape', () => {
      const def = getEventDefinition('automation.approval_reviewed')
      expect(def).toBeDefined()
      expect(def?.module).toBe('system')
      expect(def?.default_audience).toBe('creator')
      // Template must reference the decision variable so "approved" /
      // "rejected" copy reads naturally.
      expect(def?.title_template).toMatch(/\{\{decision\}\}/)
    })
  })

  describe('dead-code removals are gone', () => {
    // Outcome C: these events never existed in the catalog, but the raw
    // insert sites referenced event_type strings that would have needed
    // catalog entries. We assert the catalog does NOT have entries for the
    // deleted dead-code flows, so a future contributor isn't tempted to
    // re-wire sendDealNotification / notifyPipelineOwner against them.
    it('has no "deal.alert" event (sendDealNotification was Outcome C)', () => {
      expect(getEventDefinition('deal.alert')).toBeUndefined()
    })

    it('has no "pipeline.alert" event (notifyPipelineOwner was Outcome C)', () => {
      expect(getEventDefinition('pipeline.alert')).toBeUndefined()
    })
  })
})
