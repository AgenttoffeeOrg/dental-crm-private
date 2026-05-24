# Practice playbook — Path 2 task creation

> Phase 2b.58+ — `/automations` extension. Lets the practice
> configure repeatable rules that auto-create tasks on deal /
> contact lifecycle events. Two layers: pre-built templates + a
> custom rule builder.

## Job-to-be-done

Every dental practice has a *playbook* — recurring patterns that
happen the same way every time:
- "When we send a quote, follow up in 3 days."
- "When a new lead arrives, call within 1 business day."
- "When a consult is booked, confirm 24h before."
- "When a deal stalls in stage X for 5 days, nudge the patient."

These should be tasks the system creates automatically because
they happen the same way every time. The practice configures the
rules once; the system runs them.

## Where it lives

`/automations` — the existing sidebar page from phase 2b.20+ work.
The backend `src/lib/automations/task-automation-actions.ts` already
has 24+ task-creation writes wired (per the contacts/dashboard
audit). We extend the UI, not build a new page.

## Two-layer UX

### Layer 1 — Pre-built templates (cards on /automations)

Ship the app with ~8 sensible defaults. Each renders as a card the
practice can toggle on/off + Edit to tweak the title / delay /
assignee.

Default templates:

| Pipeline scope | Template | Default ON? |
|---|---|---|
| Any | "New lead arrives → call within 1 business day" | ON |
| Any | "No activity on deal for 7 days → check-in task (24h)" | OFF |
| Any | "Deal moves to Closed Lost → re-engagement task in 6 months" | OFF |
| New Patient Acquisition | "Consult booked → confirm 24h before" | ON |
| Implant / Invisalign | "Quote sent → follow up in 3 days if no patient reply" | ON |
| Implant | "Deposit paid → schedule fitting reminder (7 days)" | ON |
| Any treatment | "Deal stalled in stage for 5 days → nudge patient" | OFF |
| Any | "VIP-tagged contact arrives → call within 1 hour" | OFF |

Templates render as cards in /automations:

```
┌────────────────────────────────────────────────────────────────┐
│  ✓ Quote sent → follow up in 3 days                            │
│  When a deal moves into the "Quote Sent" stage on Implant or   │
│  Invisalign pipelines, create a "Follow up on quote" task due   │
│  3 days later, assigned to the contact's owner.                │
│                                       [ Edit ] [ ✓ Active toggle]│
└────────────────────────────────────────────────────────────────┘
```

Edit opens an inline form to change the title / delay / assignee /
priority. Same shape as the custom rule builder.

### Layer 2 — Custom rule builder

"+ Create custom rule" button → opens the existing Workflow Wizard
extended with task-creation as a step type. 3-step flow:

#### Step 1 — Trigger

Dropdown:
- "When a deal moves into stage [X] of pipeline [Y]"
- "When a deal is created in pipeline [Y]"
- "When a contact is created via [source]"
- "When a deal has no activity for [N] days"
- "When a contact gets the [X] tag"

(v1 triggers only. More can be added later. NO "patient said X on
SMS" — that's Path 1 AI-suggest.)

#### Step 2 — Wait

Dropdown:
- "Immediately" (default)
- "[N] hours later"
- "[N] days later" (with business-day toggle)
- "[Day of week] at [time]" (e.g. "Tuesday at 9am")

#### Step 3 — Create task

Form:
- **Title** — text field with template variables: `{contact.full_name}`,
  `{deal.title}`, `{deal.value}`, `{stage.name}`. Renders a preview
  below as the practice types.
- **Assignee** — radio: Contact's owner / Specific person / Group /
  Everyone. (Practice's tenant default is pre-selected.)
- **Priority** — low / normal / high / urgent (default = normal).
- **Recurring** — none / daily / weekly / monthly (default = none).
- **Task type** — call / email / sms / whatsapp / note / generic.
  Auto-inferred from the trigger when possible (e.g. "send a quote"
  → email; otherwise default = generic).

Save → rule lands in `automation_rules` (existing table from 2b.20+
work). Triggers fire via the existing automations engine; the
helper at `task-automation-actions.ts:createTask()` does the actual
INSERT.

## Operator behaviour

- **Edit / disable a template** — practice can toggle a default
  off if their workflow differs. We preserve their toggle state
  across upgrades (we DON'T re-enable defaults on app updates).
- **Stop creating duplicates** — when a rule fires for the same
  (deal_id, rule_id) within a short window, don't create a duplicate
  task. Idempotency window = the rule's wait period (so "3-day
  follow-up after quote sent" only creates once per deal per stage
  entry).
- **Manual override allowed** — the operator can always delete a
  rule-created task or change its due date. The rule won't re-create.

## What's intentionally out of scope

- **Sub-rules / conditional logic** — "if quote > £5k, follow up
  faster" — defer to v2. Operators can create two rules with
  different conditions if they really need it.
- **Cross-pipeline rules** — every rule scoped to one pipeline (or
  "any pipeline"). No "if deal in Implant AND contact has tag VIP"
  combos in v1.
- **Automation-fired SMS / email sends** — that's the existing
  `automations` workflows (different step type). Tasks are only
  about creating WORK for the operator, not auto-sending.
- **Time-of-day awareness** — "only create tasks during business
  hours" — defer to v2. v1 honours business-day toggle for the
  delay computation but not opening hours.

## Data shape

Reuses existing `automation_rules` + `automation_rule_steps` tables
from 2b.20+. New "step type" added:

```typescript
type AutomationStepType =
  | 'send_message'      // existing
  | 'set_deal_stage'    // existing
  | 'add_tag'           // existing
  | 'create_task'       // <-- new for 2b.58+
```

The step's config blob holds the task template:
```json
{
  "title": "Follow up on quote for {contact.full_name}",
  "task_type": "call",
  "priority": "normal",
  "assignee_mode": "contact_owner",
  "due_at_offset": { "value": 3, "unit": "days", "business_days_only": false },
  "recurrence": "none"
}
```

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.O | Extend `task-automation-actions.createTask` to honour all the new fields (assignee modes, recurrence, source-rule-id for idempotency) |
| 2b.58.P | Add `create_task` step type to the Workflow Wizard UI |
| 2b.58.Q | Templates seed — ship the 8 default templates as DB rows on first tenant boot |
| 2b.58.R | Template card render on /automations (separate from custom rules) — toggle/edit/delete |
| 2b.58.S | Idempotency guard — don't double-fire within the rule's wait window |
