# 📚 **AUTOMATION EVENTS DOCUMENTATION**

**Complete reference for all events in the unified event system**

---

## 🎯 **OVERVIEW**

The automation system supports **50+ event types** across **9 categories**:
1. **Deal Events** (8 types)
2. **Task Events** (6 types)
3. **Contact Events** (6 types)
4. **Pipeline Events** (4 types)
5. **Marketing Events** (5 types)
6. **Integration Events** (4 types)
7. **Analytics Events** (3 types)
8. **Call Events** (3 types)
9. **AI Events** (4 types)

Each event automatically triggers matching automations when emitted.

---

## 📋 **DEAL EVENTS**

### **DEAL.CREATED**
**Triggers when:** A new deal is created  
**Automation Use Cases:**
- Auto-assign to sales rep (round-robin)
- Send welcome email to contact
- Create follow-up task (2 hours)
- Notify team in Slack

**Payload:**
```typescript
{
  dealId: string          // UUID of the deal
  contactId: string       // Associated contact
  tenantId: string        // Tenant identifier
  pipelineId: string      // Pipeline ID
  stageId: string         // Initial stage
  value?: number          // Deal value in cents
  source?: string         // Lead source (e.g., "website", "referral")
  userId?: string         // User who created it
}
```

**Example Automation:**
```
Trigger: DEAL.CREATED where value >= 100000
Action: Notify senior closer + Create urgent task
```

---

### **DEAL.WON**
**Triggers when:** Deal is marked as won  
**Automation Use Cases:**
- Send thank-you email
- Request review (3 days later)
- Update contact to "customer" status
- Celebrate in team channel

**Payload:**
```typescript
{
  dealId: string
  contactId: string
  tenantId: string
  value: number           // Final deal value
  wonAt: string           // ISO timestamp
  userId?: string
}
```

**Example Automation:**
```
Trigger: DEAL.WON
Actions:
1. Send thank-you email immediately
2. Wait 3 days
3. Send review request email
```

---

### **DEAL.LOST**
**Triggers when:** Deal is marked as lost  
**Automation Use Cases:**
- Collect feedback reason
- Add to re-engagement nurture
- Notify manager for high-value losses
- Update win/loss analytics

**Payload:**
```typescript
{
  dealId: string
  contactId: string
  tenantId: string
  lostReason?: string     // Why deal was lost
  lostAt: string
  userId?: string
}
```

---

### **DEAL.AGING**
**Triggers when:** Deal has been inactive for X days  
**Automation Use Cases:**
- Send reminder to owner
- Escalate to manager (if high-value)
- Auto-create follow-up task
- Alert in daily digest

**Payload:**
```typescript
{
  dealId: string
  contactId: string
  tenantId: string
  daysSinceLastActivity: number
  lastActivityAt: string
}
```

**Example Automation:**
```
Trigger: DEAL.AGING where days >= 7 AND value >= 50000
Action: Create task for manager + Send escalation email
```

---

### **DEAL.MOVED** (Stage Change)
**Triggers when:** Deal moves from one stage to another  
**Automation Use Cases:**
- Send stage-specific emails
- Create stage-specific tasks
- Update probabilities
- Notify relevant team members

**Payload:**
```typescript
{
  dealId: string
  tenantId: string
  fromStageId: string
  toStageId: string
  fromStageName?: string
  toStageName?: string
  userId?: string
}
```

**Example Automation:**
```
Trigger: DEAL.MOVED to "Proposal Sent"
Actions:
1. Send proposal confirmation email
2. Create task "Follow up on proposal" (due in 2 days)
```

---

### **DEAL.VALUE_THRESHOLD_CROSSED**
**Triggers when:** Deal value crosses a specific threshold  
**Automation Use Cases:**
- Escalate high-value deals
- Require approval for large deals
- Notify executives
- Special handling triggers

**Payload:**
```typescript
{
  dealId: string
  contactId: string
  tenantId: string
  oldValue: number
  newValue: number
  threshold: number       // Crossed threshold
}
```

---

### **DEAL.ASSIGNED**
**Triggers when:** Deal owner changes  
**Automation Use Cases:**
- Notify new owner
- Send handoff email
- Update CRM record
- Log ownership change

**Payload:**
```typescript
{
  dealId: string
  tenantId: string
  fromUserId?: string
  toUserId: string
  userId?: string         // Who made the change
}
```

---

## 📋 **TASK EVENTS**

### **TASK.CREATED**
**Triggers when:** New task is created  
**Automation Use Cases:**
- Notify assignee
- Add to daily digest
- Sync with calendar
- Track task metrics

**Payload:**
```typescript
{
  taskId: string
  title: string
  tenantId: string
  assigneeUserId?: string
  contactId?: string
  dealId?: string
  autoCreated: boolean    // Was it auto-created?
  priority: string        // "low", "normal", "high", "urgent"
  dueAt?: string
}
```

---

### **TASK.COMPLETED**
**Triggers when:** Task is marked as completed  
**Automation Use Cases:**
- Trigger next task in sequence
- Update deal stage
- Notify task creator
- Update activity metrics

**Payload:**
```typescript
{
  taskId: string
  tenantId: string
  completedAt: string
  userId?: string
}
```

**Example Automation:**
```
Trigger: TASK.COMPLETED where task_type = "send_proposal"
Action: Auto-move deal to "Proposal Sent" stage
```

---

### **TASK.OVERDUE**
**Triggers when:** Task becomes overdue  
**Automation Use Cases:**
- Send reminder to assignee
- Escalate to manager (after X hours)
- Update priority to "urgent"
- Log in overdue report

**Payload:**
```typescript
{
  taskId: string
  tenantId: string
  assigneeUserId?: string
  dueAt: string
  hoursOverdue: number
}
```

**Example Automation:**
```
Trigger: TASK.OVERDUE where hours >= 24
Actions:
1. Send reminder email to assignee
2. Notify manager
3. Update priority to "urgent"
```

---

### **TASK.DUE_SOON**
**Triggers when:** Task is due soon (e.g., 1 hour before)  
**Automation Use Cases:**
- Send reminder notification
- Add to priority list
- Alert via SMS/push

**Payload:**
```typescript
{
  taskId: string
  tenantId: string
  assigneeUserId?: string
  dueAt: string
  hoursUntilDue: number
}
```

---

### **TASK.ASSIGNED**
**Triggers when:** Task is assigned to someone  
**Automation Use Cases:**
- Notify new assignee
- Update workload metrics
- Add to assignee's queue

**Payload:**
```typescript
{
  taskId: string
  tenantId: string
  fromUserId?: string
  toUserId: string
}
```

---

## 📋 **CONTACT EVENTS**

### **CONTACT.CREATED**
**Triggers when:** New contact is created  
**Automation Use Cases:**
- Send welcome email
- Add to nurture sequence
- Assign to owner (round-robin)
- Create initial task

**Payload:**
```typescript
{
  contactId: string
  tenantId: string
  source?: string         // "website", "referral", etc.
  userId?: string
}
```

**Example Automation:**
```
Trigger: CONTACT.CREATED where source = "website"
Actions:
1. Send welcome email
2. Wait 2 days
3. Send value proposition email
4. Wait 3 days
5. Send case study email
```

---

### **CONTACT.INACTIVE**
**Triggers when:** Contact has been inactive for X days  
**Automation Use Cases:**
- Re-engagement campaign
- Win-back offers
- Archive warnings
- Cleanup reminders

**Payload:**
```typescript
{
  contactId: string
  tenantId: string
  daysSinceLastActivity: number
  lastActivityAt: string
}
```

---

### **CONTACT.HIGH_VALUE**
**Triggers when:** Contact becomes high-value (based on total deals)  
**Automation Use Cases:**
- Assign to senior rep
- VIP treatment workflow
- Special offers
- Account management

**Payload:**
```typescript
{
  contactId: string
  tenantId: string
  totalDealValue: number
  dealCount: number
}
```

---

### **CONTACT.MILESTONE**
**Triggers when:** Contact reaches a milestone (birthday, anniversary)  
**Automation Use Cases:**
- Send birthday wishes
- Anniversary offers
- Customer appreciation

**Payload:**
```typescript
{
  contactId: string
  tenantId: string
  milestoneType: 'birthday' | 'anniversary' | 'custom'
  date: string
}
```

---

## 📋 **PIPELINE EVENTS**

### **PIPELINE.CAPACITY_REACHED**
**Triggers when:** Pipeline reaches capacity threshold  
**Automation Use Cases:**
- Pause new assignments
- Notify manager
- Redistribute deals
- Alert for bottleneck

**Payload:**
```typescript
{
  pipelineId: string
  tenantId: string
  currentCapacity: number
  maxCapacity: number
  percentage: number      // % full
}
```

---

### **PIPELINE.VELOCITY_SLOW**
**Triggers when:** Pipeline velocity drops below target  
**Automation Use Cases:**
- Alert sales manager
- Trigger review meeting
- Generate velocity report

**Payload:**
```typescript
{
  pipelineId: string
  tenantId: string
  dealsPerWeek: number
  targetDealsPerWeek: number
}
```

---

### **PIPELINE.BOTTLENECK_DETECTED**
**Triggers when:** Stage has too many stuck deals  
**Automation Use Cases:**
- Notify pipeline owner
- Trigger process review
- Escalate stuck deals

**Payload:**
```typescript
{
  pipelineId: string
  stageId: string
  tenantId: string
  stuckDealsCount: number
  avgDaysInStage: number
}
```

---

### **PIPELINE.STAGE_SLA_BREACHED**
**Triggers when:** Deal breaches stage SLA  
**Automation Use Cases:**
- Escalate deal
- Notify manager
- Auto-move to next stage
- Alert owner

**Payload:**
```typescript
{
  pipelineId: string
  stageId: string
  dealId: string
  tenantId: string
  maxDays: number
  actualDays: number
}
```

---

## 📋 **MARKETING EVENTS**

### **MARKETING.EMAIL_OPENED**
### **MARKETING.LINK_CLICKED**
### **MARKETING.FORM_SUBMITTED**
### **MARKETING.UNSUBSCRIBED**

See `MARKETING_MODULE_COMPLETE.md` for full marketing event documentation.

---

## 📋 **INTEGRATION EVENTS**

### **INTEGRATION.TOKEN_EXPIRING**
### **INTEGRATION.TOKEN_EXPIRED**
### **INTEGRATION.SYNC_FAILED**
### **INTEGRATION.RATE_LIMIT_HIT**

See `INTEGRATION_HARDENING_COMPLETE.md` for full integration event documentation.

---

## 📋 **ANALYTICS EVENTS**

### **ANALYTICS.KPI_BREACH**
### **ANALYTICS.GOAL_ACHIEVED**
### **ANALYTICS.ANOMALY_DETECTED**

See `ANALYTICS_ENHANCEMENTS_COMPLETE.md` for full analytics event documentation.

---

## 🔧 **HOW TO USE EVENTS**

### **Emitting Events (for Developers)**

```typescript
import { events } from '@/lib/events-unified'

// Emit a deal created event
await events.dealCreated({
  dealId: 'deal-123',
  contactId: 'contact-456',
  tenantId: 'tenant-789',
  pipelineId: 'pipeline-abc',
  stageId: 'stage-xyz',
  value: 50000,
  source: 'website'
})
```

### **Using Event Emitters (Recommended)**

```typescript
import { emitDealCreated } from '@/lib/automations/event-emitters'

// Automatically emits event after successful insert
const { data, error } = await emitDealCreated(supabase, {
  tenant_id: 'tenant-789',
  contact_id: 'contact-456',
  pipeline_id: 'pipeline-abc',
  stage_id: 'stage-xyz',
  value_estimate_cents: 5000000,
  source: 'website'
})
```

---

## 🎯 **AUTOMATION EXAMPLES**

### **Example 1: High-Value Deal Alert**
```
Trigger: DEAL.CREATED where value >= 100000
Conditions:
  - Value >= £100,000
Actions:
  1. Notify senior closer via email
  2. Create urgent task "Review high-value deal"
  3. Post to #sales-alerts Slack channel
```

### **Example 2: Deal Aging Escalation**
```
Trigger: DEAL.AGING where days >= 7 AND value >= 50000
Conditions:
  - Days since last activity >= 7
  - Deal value >= £50,000
Actions:
  1. Send reminder email to owner
  2. Wait 2 days
  3. If still inactive, escalate to manager
```

### **Example 3: Task Completion Chain**
```
Trigger: TASK.COMPLETED where title contains "Send Proposal"
Actions:
  1. Auto-move deal to "Proposal Sent" stage
  2. Create new task "Follow up on proposal" (due in 2 days)
  3. Send confirmation email to contact
```

### **Example 4: Contact Nurture Sequence**
```
Trigger: CONTACT.CREATED where source = "website"
Actions:
  1. Send welcome email immediately
  2. Wait 2 days
  3. Send value proposition email
  4. Wait 3 days
  5. If no deal created, send case study email
  6. Wait 5 days
  7. If no deal created, send special offer email
```

---

## 📊 **EVENT STATISTICS**

Track automation performance with these metrics:
- **Events emitted per day** (by type)
- **Automations triggered per event**
- **Automation success rate**
- **Average execution time**
- **Failed automations** (DLQ)

Access via: `automation_event_log` table

---

## 🔒 **SECURITY & PRIVACY**

- **RLS Policies:** All events scoped to tenant
- **Consent Enforcement:** Email/SMS automations check consent
- **Audit Trail:** All events logged for 90 days
- **Replay Capability:** Replay failed events from DLQ

---

## 🚀 **INITIALIZATION**

To enable the automation system:

```typescript
import { initializeAutomationSystem } from '@/lib/automations/initialize'

// Call on app startup (in layout or _app.tsx)
useEffect(() => {
  initializeAutomationSystem()
}, [])
```

---

**Last Updated:** January 16, 2025  
**Version:** 1.0.0  
**Total Events:** 50+  
**Total Trigger Types:** 45+

