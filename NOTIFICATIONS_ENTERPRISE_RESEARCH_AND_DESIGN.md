# 🔔 NOTIFICATIONS SYSTEM - ENTERPRISE RESEARCH & COMPLETE DESIGN

**Date:** January 16, 2025  
**Status:** 🔬 Research Complete → 🏗️ Ready to Build  
**Current Score:** 20/100 (Prototype)  
**Target Score:** 100/100 (Enterprise)

---

## 🎯 **EXECUTIVE SUMMARY**

**Current State:**
- Basic bell dropdown with mock data
- No persistence or real delivery
- ~10 events in memory bus
- Basic settings UI (not functional)
- **Score: 20/100**

**Goal:**
- Unified notifications system
- 50+ events across all modules
- Multi-channel delivery (In-app, Email, SMS)
- Real-time WebSocket updates
- Deep preference management
- Admin policies & governance
- **Target: 100/100**

---

## 📚 PHASE 1: DEEP WEB RESEARCH & BENCHMARKING

### **1.1 CRM Notifications (Salesforce, HubSpot, Zoho)**

**Salesforce Lightning:**
- **Bell Icon:** Persistent in app bar, badge with count (99+ cap)
- **Drawer Pattern:** Right-side slide-out (400px width)
- **Tabs:** All, Unread, @Mentions, Tasks
- **Quick Actions:** Mark as read, Follow/Unfollow, Snooze
- **Grouping:** By object (Opportunity, Lead, Case)
- **Settings:** Per-event toggles, push/email/in-app, quiet hours
- **Real-time:** WebSocket updates, instant badge refresh
- **Source:** https://help.salesforce.com/s/articleView?id=sf.notifications_intro.htm

**HubSpot:**
- **Notification Center:** Dropdown (not drawer), scrollable list
- **Categories:** Marketing, Sales, Service, Operations, Account
- **Actions:** Dismiss, View all notifications page
- **Preferences:** Per-module on/off, email digest frequency
- **Real-time:** Polling (15s intervals), not WebSocket
- **Source:** https://knowledge.hubspot.com/settings/manage-notification-settings

**Zoho CRM:**
- **Bell Icon:** Badge count, dropdown with recent 10
- **Full Page:** "Notifications" module with filters
- **Channels:** In-app, Email, Mobile push, SMS (premium)
- **Rules Engine:** Custom notification rules (if X then notify Y)
- **Escalation:** Auto-escalate if not acknowledged
- **Source:** https://www.zoho.com/crm/help/automation/notifications.html

**Key Takeaways:**
✅ Drawer > Dropdown (Salesforce wins on UX)
✅ Real-time is critical (WebSocket > Polling)
✅ Quick actions on each item (read, mute, open)
✅ Grouping & threading for context
✅ Full page for power users (search, bulk actions)

---

### **1.2 Collaboration Tools (Slack, Teams, GitHub)**

**Slack:**
- **All Unreads:** Dedicated section, keyboard nav (Alt+Shift+↑/↓)
- **Channels:** Mute, leave, mark as read
- **Threads:** Follow thread, mute thread
- **DND:** Schedule quiet hours, snooze notifications
- **Priority:** @channel, @here, direct mentions, keywords
- **Source:** https://slack.com/help/articles/201355156-Guide-to-desktop-notifications

**Microsoft Teams:**
- **Feed:** Activity feed with filters (Mentions, Replies, Reactions)
- **Badge:** Persistent on icon, click opens feed
- **Channels:** Banner notifications, custom alert sounds
- **Priorities:** Important flag, @mention, channel notifications
- **Mobile:** Push notifications with rich previews
- **Source:** https://support.microsoft.com/en-us/office/manage-notifications-in-teams

**GitHub:**
- **Inbox:** Unified inbox (/notifications), badge count
- **Filters:** Unread, Participating, Mentioned, Team, Assigned, Review requested
- **Actions:** Mark as done, Save for later, Unsubscribe from thread
- **Email:** Per-repo settings, watch levels (Ignore, Participating, Watching, All)
- **Real-time:** WebSocket for instant updates
- **Source:** https://github.com/notifications

**Key Takeaways:**
✅ Threading & context (follow/unfollow threads)
✅ Rich filtering (assigned, mentioned, team)
✅ Snooze & save for later
✅ Per-object subscriptions (watch/unwatch)
✅ Keyboard shortcuts for power users

---

### **1.3 Design Systems (Material, Carbon, Atlassian)**

**Material Design (Google):**
- **Badge:** Max 999, absolute positioned on icon
- **Notification Panel:** Slide-in from top or side
- **Cards:** Each notification is a card with primary action
- **Grouping:** Stack similar notifications ("3 new messages")
- **Snackbar:** Temporary toast for immediate feedback
- **Source:** https://m3.material.io/components/badges

**IBM Carbon:**
- **Notification Type:** Inline, Toast, Banner, Modal
- **Severity:** Info, Success, Warning, Error
- **Actions:** Primary CTA, secondary dismiss
- **Accessibility:** ARIA live regions, focus management
- **Source:** https://carbondesignsystem.com/components/notification

**Atlassian Design System:**
- **Flag:** Toast-like notification (auto-dismiss or persistent)
- **Inline Message:** Embedded in context (forms, lists)
- **Banner:** Top of page for system-wide alerts
- **Focus Management:** Trap focus in modals, restore on close
- **Source:** https://atlassian.design/components/flag

**Key Takeaways:**
✅ Use badge for count (cap at 99+)
✅ Drawer/panel for list (not dropdown)
✅ Toast (sonner) for immediate feedback
✅ Severity levels (info/success/warning/error)
✅ WCAG 2.1 AA compliance (focus, aria, keyboard)

---

### **1.4 Security & Compliance (OWASP, GDPR)**

**OWASP ASVS (Application Security Verification Standard):**
- **V9.2 Communications:** Encrypt in transit (TLS 1.2+), sign webhooks
- **V8.3 Sensitive Data:** Don't include PII in notification text
- **V10.2 Malicious Code:** Sanitize user-generated content in notifications
- **V4.3 Access Control:** RLS/ACL on notifications (role & location scope)
- **Source:** https://owasp.org/www-project-application-security-verification-standard/

**GDPR & CCPA:**
- **Consent:** Explicit opt-in for email/SMS notifications
- **Right to Access:** Users can export all notifications
- **Right to Delete:** Users can delete notification history
- **Data Minimization:** Only store what's necessary
- **Retention:** Define max retention period (e.g., 90 days)
- **Source:** https://gdpr.eu/

**Best Practices:**
✅ Encrypted storage (at rest & in transit)
✅ Opt-in for off-platform channels (email/SMS)
✅ RLS: users only see their notifications
✅ Audit logs for preference changes
✅ Data retention policy (auto-delete old notifications)

---

### **1.5 Notification Infrastructure (AWS SNS, Twilio, SendGrid)**

**AWS SNS (Simple Notification Service):**
- **Pub/Sub:** Publishers emit events, subscribers receive
- **Fan-out:** One event → multiple channels (Email, SMS, Lambda)
- **Retries:** Exponential backoff, DLQ for failures
- **Filtering:** Subscribers filter by message attributes
- **Source:** https://aws.amazon.com/sns/

**Twilio (SMS/WhatsApp):**
- **Webhooks:** Delivery status callbacks (queued, sent, delivered, failed)
- **Rate Limits:** Respect carrier limits (1 msg/sec default)
- **Opt-out:** Handle STOP keywords automatically
- **Templates:** Pre-approved templates for compliance
- **Source:** https://www.twilio.com/docs/sms

**SendGrid (Email):**
- **Events:** Webhook for opens, clicks, bounces, spam reports
- **Templates:** Handlebars/Jinja for dynamic content
- **Unsubscribe:** One-click unsubscribe (RFC 8058)
- **Suppression Lists:** Bounce/spam/unsubscribe lists
- **Source:** https://sendgrid.com/docs/

**Key Takeaways:**
✅ Use message queue (SQS/Redis) for fan-out
✅ Retry with exponential backoff + jitter
✅ DLQ for failed deliveries
✅ Idempotency keys to prevent duplicates
✅ Webhook signatures for security

---

## 🎨 PHASE 2: UX & UI DESIGN

### **2.1 Global Notifications Bell**

**Placement:**
- App bar (top-right)
- Between Search and User Avatar
- Persistent across all pages

**Visual States:**
```
Idle:     <Bell />
Active:   <Bell className="text-blue-600" /> + Badge(count)
Loading:  <Bell className="animate-pulse" />
```

**Badge:**
- Position: absolute top-right (-8px, -8px)
- Count: 1-99 (show "99+" if > 99)
- Color: Red (bg-red-600)
- Accessible label: "Notifications (3 unread)"

**Keyboard Shortcut:**
- `G` then `N` (GitHub-style)
- Or `Ctrl/Cmd + Shift + N`

**Click Behavior:**
- Opens right-side drawer (400px width)
- Focus management: trap focus in drawer
- Close: Esc key, click outside, close button

---

### **2.2 Notifications Drawer (In-App Inbox)**

**Layout:**

```
┌─────────────────────────────────────┐
│ Notifications          [Search] [⚙️]│  ← Header
├─────────────────────────────────────┤
│ [All] [Unread] [@Me] [System]      │  ← Tabs
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🟦 Deal Assigned                │ │  ← Item
│ │ John Doe assigned "Implants"    │ │
│ │ 5 mins ago • Pipeline           │ │
│ │ [Mark Read] [Mute] [Open →]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ⚠️  Task Overdue                │ │
│ │ "Follow-up" is now 2 days late  │ │
│ │ 2 hours ago • Tasks             │ │
│ │ [Complete] [Snooze] [Open →]   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ✅ Campaign Sent                │ │
│ │ "Summer Promo" sent to 1,234    │ │
│ │ Yesterday • Marketing           │ │
│ │ [View Report →]                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [View All] [Mark All Read]         │  ← Footer
└─────────────────────────────────────┘
```

**Header:**
- Title: "Notifications"
- Search input (filter by keyword)
- Gear icon → deep-link to `/settings?tab=notifications`

**Tabs/Filters:**
- All: Show everything
- Unread: Only unread (default)
- @Me: Mentions, assignments
- System: Errors, warnings, maintenance

**Item Structure:**
- Icon: Emoji or Lucide icon for event type
- Title: Short, actionable (e.g., "Deal assigned to you")
- Body: Context snippet (who, what, where)
- Timestamp: Relative ("5 mins ago") + absolute tooltip
- Badges: Priority (🔴 Urgent), Module (Pipeline, Tasks)
- Actions: 2-3 quick actions per item

**Quick Actions:**
- **Mark Read/Unread:** Toggle read state
- **Mute:** Stop notifications for this object (deal/contact)
- **Snooze:** Remind me later (2h, tomorrow 9am, next week)
- **Archive:** Hide from list (recoverable)
- **Open:** Deep-link to object (Deal detail, Task, Campaign)
- **Custom:** Event-specific (Complete Task, Assign Deal, etc.)

**Empty States:**
- No unread: "All caught up! 🎉"
- No notifications ever: "You'll see important updates here"
- Filtered (no results): "No notifications for @mentions"

**Performance:**
- Virtualized list (react-window) for 1000+ items
- Skeleton loaders while fetching
- Optimistic updates (mark read instantly, sync in background)

---

### **2.3 Full Notifications Page (Optional)**

**Route:** `/notifications`

**Features:**
- **Table View:** Sortable columns (Date, Type, Module, Status)
- **Advanced Filters:** Date range, module, severity, read/unread
- **Bulk Actions:** Mark all as read, archive selected, delete
- **Search:** Full-text search across title + body
- **Saved Views:** "My alerts last 7 days", "Unread deals"
- **Export:** CSV export for auditing

**Why Full Page:**
- Power users need bulk management
- Audit trail for compliance
- Advanced search & filtering
- Better for large volumes (100+ per day)

---

## 🔔 PHASE 3: EVENT CATALOG

### **3.1 Canonical Event Schema**

```typescript
interface NotificationEvent {
  // Identity
  event_key: string           // 'deal.assigned', 'task.overdue'
  event_id: string            // UUID for idempotency
  
  // Source
  tenant_id: string
  location_id?: string
  module: 'deals' | 'tasks' | 'marketing' | 'integrations' | 'system'
  
  // Trigger
  triggered_by_user_id?: string
  triggered_at: Date
  
  // Payload
  title: string               // "Deal assigned to you"
  body: string                // "John Doe assigned 'Dental Implants'"
  severity: 'info' | 'success' | 'warning' | 'error' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Context
  entity_type: 'deal' | 'contact' | 'task' | 'campaign' | 'integration'
  entity_id: string
  entity_url: string          // Deep-link: /deals/123
  
  // Actions
  quick_actions: QuickAction[]
  
  // Routing
  recipient_user_ids?: string[]
  recipient_roles?: string[]
  recipient_locations?: string[]
  
  // Channels
  default_channels: ('in_app' | 'email' | 'sms' | 'push')[]
  
  // Lifecycle
  expires_at?: Date
  group_key?: string          // For grouping/threading
  parent_event_id?: string    // For replies/threads
  
  // Metadata
  metadata?: Record<string, any>
}

interface QuickAction {
  action_key: string          // 'mark_complete', 'open_deal'
  label: string               // "Complete Task"
  type: 'primary' | 'secondary' | 'destructive'
  endpoint?: string           // API endpoint for action
  navigation_url?: string     // Or deep-link URL
}
```

---

### **3.2 Complete Event Catalog (50+ Events)**

| # | Event Key | Module | Trigger | Severity | Default Channels | Audience | Quick Actions |
|---|-----------|--------|---------|----------|-----------------|----------|---------------|
| **DEALS & PIPELINE** |
| 1 | `deal.assigned` | Deals | Deal assigned to user | info | in_app, email | Assignee | Open Deal, Accept |
| 2 | `deal.created` | Deals | New deal created | info | in_app | Owner, Manager | Open Deal |
| 3 | `deal.stage_changed` | Deals | Deal moved to new stage | info | in_app | Owner | Open Deal |
| 4 | `deal.won` | Deals | Deal marked as won | success | in_app, email | Owner, Manager | View Report |
| 5 | `deal.lost` | Deals | Deal marked as lost | warning | in_app | Owner, Manager | Open Deal |
| 6 | `deal.aging` | Deals | Deal stuck in stage > 30d | warning | in_app, email | Owner | Open Deal, Move Stage |
| 7 | `deal.sla_breach` | Deals | Deal breached SLA | error | in_app, email, sms | Owner, Manager | Open Deal, Escalate |
| 8 | `deal.value_changed` | Deals | Deal value updated | info | in_app | Owner | Open Deal |
| 9 | `deal.note_mention` | Deals | User @mentioned in note | info | in_app, email | Mentioned user | Open Deal, Reply |
| 10 | `deal.duplicate_suspected` | Deals | Potential duplicate found | warning | in_app | Creator | Merge, Dismiss |
| **CONTACTS** |
| 11 | `contact.created` | Contacts | New contact added | info | in_app | Owner, Marketing | Open Contact |
| 12 | `contact.assigned` | Contacts | Contact assigned to user | info | in_app, email | Assignee | Open Contact |
| 13 | `contact.duplicate_suspected` | Contacts | Potential duplicate | warning | in_app | Creator | Merge, Dismiss |
| 14 | `contact.opt_out` | Contacts | Contact opted out | warning | in_app, email | Marketing | Open Contact |
| 15 | `contact.high_intent_detected` | Contacts | Clicked high-intent link | urgent | in_app, email, sms | Owner | Call Now, Open |
| **TASKS** |
| 16 | `task.assigned` | Tasks | Task assigned to user | info | in_app, email | Assignee | Open Task, Accept |
| 17 | `task.due_soon` | Tasks | Task due in < 24h | warning | in_app, email | Assignee | Complete, Snooze |
| 18 | `task.overdue` | Tasks | Task overdue | error | in_app, email, sms | Assignee, Manager | Complete, Reassign |
| 19 | `task.completed` | Tasks | Task marked complete | success | in_app | Assigner | View Task |
| 20 | `task.auto_created` | Tasks | AI auto-created task | info | in_app | Assignee | Open Task, Edit |
| **MARKETING (CAMPAIGNS)** |
| 21 | `campaign.approved` | Marketing | Campaign approved | success | in_app | Creator | Send Now, Schedule |
| 22 | `campaign.scheduled` | Marketing | Campaign scheduled | info | in_app | Creator, Marketing | View Campaign |
| 23 | `campaign.sent` | Marketing | Campaign sent | success | in_app, email | Creator, Marketing | View Report |
| 24 | `campaign.failed` | Marketing | Campaign send failed | error | in_app, email, sms | Creator, Admin | Retry, View Logs |
| 25 | `campaign.deliverability_issue` | Marketing | High bounce/spam rate | warning | in_app, email | Marketing, Admin | View Report |
| 26 | `campaign.ab_winner_selected` | Marketing | A/B test winner chosen | success | in_app | Creator | Send Winner |
| 27 | `campaign.unsubscribe_spike` | Marketing | Unusual unsubscribe rate | warning | in_app, email | Marketing | View Report |
| 28 | `campaign.domain_auth_issue` | Marketing | SPF/DKIM not configured | error | in_app, email | Admin | Fix DNS |
| **MARKETING (AUDIT)** |
| 29 | `audit.completed` | Marketing | New audit report ready | success | in_app, email | Marketing, Owner | View Report |
| 30 | `audit.score_drop` | Marketing | Score dropped > 10pts | warning | in_app, email | Marketing | View Audit |
| 31 | `audit.cwv_regression` | Marketing | Core Web Vitals worse | warning | in_app | Marketing, Dev | View Details |
| 32 | `audit.gbp_rating_drop` | Marketing | GBP rating decreased | warning | in_app, email | Owner, Marketing | View GBP |
| 33 | `audit.gsc_coverage_errors` | Marketing | GSC coverage errors | error | in_app | Marketing, Dev | View GSC |
| 34 | `audit.competitor_overtook` | Marketing | Competitor ranked higher | warning | in_app | Marketing | View Benchmark |
| **ANALYTICS** |
| 35 | `analytics.kpi_breach` | Analytics | KPI below threshold | warning | in_app, email | Owner, Manager | View Dashboard |
| 36 | `analytics.variance_alert` | Analytics | MoM/YoY variance > 20% | warning | in_app | Owner, Analyst | View Report |
| 37 | `analytics.data_refresh_failed` | Analytics | Data refresh failed | error | in_app | Admin, Analyst | Retry, View Logs |
| 38 | `analytics.goal_achieved` | Analytics | Goal reached | success | in_app, email | Team | Celebrate 🎉 |
| 39 | `analytics.anomaly_detected` | Analytics | Unusual pattern detected | warning | in_app | Analyst | Investigate |
| **FORMS** |
| 40 | `form.submission_received` | Forms | New form submission | info | in_app, email | Marketing, Owner | View Submission |
| 41 | `form.high_error_rate` | Forms | Form field errors spike | warning | in_app | Marketing | Fix Form |
| 42 | `form.spam_surge` | Forms | Spam submissions surge | warning | in_app, email | Admin | Enable reCAPTCHA |
| 43 | `form.mapping_failure` | Forms | CRM mapping failed | error | in_app | Admin | Fix Mapping |
| **INTEGRATIONS** |
| 44 | `integration.token_expiring` | Integrations | OAuth token expires in 7d | warning | in_app, email | Admin | Reconnect |
| 45 | `integration.token_expired` | Integrations | OAuth token expired | error | in_app, email, sms | Admin | Reconnect Now |
| 46 | `integration.webhook_failure` | Integrations | Webhook delivery failed | error | in_app | Admin | Retry, View Logs |
| 47 | `integration.rate_limit_warning` | Integrations | Approaching rate limit | warning | in_app | Admin | View Usage |
| 48 | `integration.sync_failed` | Integrations | Data sync failed | error | in_app, email | Admin | Retry, Investigate |
| 49 | `integration.retries_exhausted` | Integrations | All retries failed, in DLQ | critical | in_app, email, sms | Admin | Manual Fix |
| **SETTINGS & SECURITY** |
| 50 | `settings.role_changed` | Settings | User role changed | info | in_app, email | User, Admin | View Permissions |
| 51 | `settings.sso_configured` | Settings | SSO setup complete | success | in_app | Admin | Test SSO |
| 52 | `settings.secret_rotated` | Settings | API key/secret rotated | info | in_app | Admin | Update Apps |
| 53 | `settings.risky_change_blocked` | Settings | Dangerous config blocked | warning | in_app, email | Admin | Review |
| **AI & AUTOMATION** |
| 54 | `ai.auto_action_executed` | AI | Auto-action performed | info | in_app | Owner | View Action |
| 55 | `ai.human_loop_required` | AI | AI needs human approval | warning | in_app, email | Owner | Approve, Reject |
| 56 | `ai.model_error` | AI | AI processing failed | error | in_app | Admin | Retry, View Logs |
| **SYSTEM / INCIDENTS** |
| 57 | `system.partial_outage` | System | Service degraded | error | in_app, email | All | View Status |
| 58 | `system.maintenance_scheduled` | System | Maintenance window upcoming | info | in_app, email | All | View Schedule |
| 59 | `system.recovery_complete` | System | System back to normal | success | in_app | All | Dismiss |
| 60 | `system.backup_completed` | System | Automated backup done | success | in_app | Admin | View Backup |

---

### **3.3 Multi-Location Routing**

**Audience Resolution:**
```typescript
function resolveAudience(event: NotificationEvent): string[] {
  const recipients: string[] = []
  
  // Explicit user IDs
  if (event.recipient_user_ids) {
    recipients.push(...event.recipient_user_ids)
  }
  
  // Role-based (scoped to location)
  if (event.recipient_roles) {
    const users = await getUsersByRoles(
      event.tenant_id,
      event.recipient_roles,
      event.location_id // Scope to location if provided
    )
    recipients.push(...users.map(u => u.id))
  }
  
  // Location-based (all users at location)
  if (event.recipient_locations) {
    const users = await getUsersByLocations(
      event.tenant_id,
      event.recipient_locations
    )
    recipients.push(...users.map(u => u.id))
  }
  
  return [...new Set(recipients)] // Dedupe
}
```

---

## ⚙️ PHASE 4: PREFERENCES & POLICY

### **4.1 User Preferences Schema**

```typescript
interface UserNotificationPreferences {
  user_id: string
  tenant_id: string
  
  // Global toggles
  enabled_channels: {
    in_app: boolean
    email: boolean
    sms: boolean
    push: boolean
  }
  
  // Per-event preferences
  event_preferences: {
    [event_key: string]: {
      in_app: boolean
      email: boolean
      sms: boolean
      priority_threshold: 'low' | 'medium' | 'high' | 'urgent'
    }
  }
  
  // Schedules
  quiet_hours: {
    enabled: boolean
    timezone: string
    start_time: string  // "22:00"
    end_time: string    // "08:00"
    days: string[]      // ["monday", "tuesday", ...]
  }
  
  // Digests
  digest_preferences: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string        // "09:00"
    timezone: string
    include_events: string[]
  }
  
  // Muted objects
  muted_objects: {
    [entity_type: string]: string[]  // { 'deal': ['deal-123', 'deal-456'] }
  }
  
  // Snooze
  snoozed_until?: Date
  
  updated_at: Date
}
```

---

### **4.2 Admin Policies Schema**

```typescript
interface NotificationPolicies {
  tenant_id: string
  
  // Role defaults (applied to new users)
  role_defaults: {
    [role: string]: {
      enabled_channels: string[]
      enabled_events: string[]
    }
  }
  
  // Escalation rules
  escalation_rules: {
    event_key: string
    escalate_after_minutes: number
    escalate_to_roles: string[]
    escalate_channels: string[]
  }[]
  
  // Rate limits (anti-spam)
  rate_limits: {
    max_notifications_per_hour: number
    max_emails_per_day: number
    max_sms_per_day: number
    batch_delay_minutes: number  // Batch similar events
  }
  
  // Retention
  retention_days: number  // Auto-delete notifications older than X
  
  // Compliance
  require_email_opt_in: boolean
  require_sms_opt_in: boolean
  allow_notification_export: boolean
  
  updated_at: Date
}
```

---

### **4.3 Settings UI Structure**

**Settings → Notifications Tab**

**Sections:**

**1. My Preferences**
- **Channels:** Toggle In-app, Email, SMS, Push
- **Events:** Table with all 60 events, toggles per channel
- **Quiet Hours:** Time range picker, timezone, days
- **Digest:** Frequency, time, included events
- **Muted Objects:** List of muted deals/contacts

**2. Org Policies** (Admin only)
- **Role Defaults:** Configure per role (Owner, Manager, Staff)
- **Escalation Rules:** When to escalate, to whom
- **Rate Limits:** Max per hour/day, batch delay
- **Retention:** Data retention period

**3. Templates** (Future)
- **Email Templates:** Customize notification emails
- **SMS Templates:** Customize SMS text

**4. Channels** (Admin only)
- **Email Provider:** SendGrid, Resend, etc.
- **SMS Provider:** Twilio, MSG91
- **Push Provider:** Firebase, OneSignal

**5. Logs** (Admin only)
- **Delivery Logs:** See all sent notifications
- **Failed Deliveries:** Retry or investigate
- **Audit Trail:** Who changed what preferences

---

## 🧠 PHASE 5: ARCHITECTURE

### **5.1 Event Pipeline**

```
┌─────────────┐
│  Producers  │ (Deals, Tasks, Marketing, etc.)
└──────┬──────┘
       │ emit(NotificationEvent)
       ▼
┌─────────────────────────────────────────┐
│      Message Queue (Redis/SQS)          │
│   (Buffer, Decouple, Back-pressure)     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Notification Router/Orchestrator       │
│  - Resolve audience (role, location)    │
│  - Apply user preferences (opt-out)     │
│  - Apply DND (quiet hours)               │
│  - Apply rate limits (throttle)          │
│  - Group & batch similar events          │
│  - Dedupe (idempotency)                  │
└──────┬──────────────────────────────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌────────────┐                      ┌──────────────┐
│  In-App    │                      │ Email/SMS    │
│  Channel   │                      │  Channels    │
│            │                      │              │
│ - Insert   │                      │ - SendGrid   │
│   to DB    │                      │ - Twilio     │
│ - Trigger  │                      │ - Retry      │
│   WebSocket│                      │ - DLQ        │
└────────────┘                      └──────────────┘
```

---

### **5.2 Database Schema**

**Table: `notifications`**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Event
  event_key VARCHAR(100) NOT NULL,
  event_id VARCHAR(100) UNIQUE,  -- For idempotency
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  severity VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  
  -- Context
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_url TEXT,
  
  -- Actions
  quick_actions JSONB DEFAULT '[]',
  
  -- Lifecycle
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Grouping
  group_key VARCHAR(200),
  parent_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_user_unread (user_id, read_at) WHERE read_at IS NULL,
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_tenant_created (tenant_id, created_at DESC),
  INDEX idx_event_id (event_id),
  INDEX idx_group_key (group_key) WHERE group_key IS NOT NULL
);
```

**Table: `notification_preferences`**
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Channels
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Per-event prefs
  event_preferences JSONB DEFAULT '{}',
  
  -- Schedules
  quiet_hours JSONB DEFAULT '{"enabled": false}',
  digest_preferences JSONB DEFAULT '{"enabled": false}',
  
  -- Muted
  muted_objects JSONB DEFAULT '{}',
  snoozed_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `notification_policies`**
```sql
CREATE TABLE notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Defaults
  role_defaults JSONB DEFAULT '{}',
  
  -- Rules
  escalation_rules JSONB DEFAULT '[]',
  rate_limits JSONB DEFAULT '{"max_per_hour": 50, "max_emails_per_day": 100}',
  
  -- Retention
  retention_days INTEGER DEFAULT 90,
  
  -- Compliance
  require_email_opt_in BOOLEAN DEFAULT FALSE,
  require_sms_opt_in BOOLEAN DEFAULT TRUE,
  allow_export BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `notification_delivery_log`**
```sql
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery
  channel VARCHAR(20) NOT NULL,  -- 'in_app', 'email', 'sms'
  status VARCHAR(20) NOT NULL,   -- 'sent', 'failed', 'bounced', 'opened', 'clicked'
  provider VARCHAR(50),           -- 'sendgrid', 'twilio', etc.
  external_id TEXT,               -- Provider's message ID
  
  -- Result
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_notification_channel (notification_id, channel),
  INDEX idx_status_created (status, created_at DESC)
);
```

---

### **5.3 Real-Time Delivery (WebSockets)**

**Option 1: Supabase Realtime (Recommended)**
```typescript
// Client-side
const supabase = createClient()

// Subscribe to user's notifications
const channel = supabase
  .channel(`notifications:${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // New notification arrived!
      updateBadgeCount()
      playNotificationSound()
      showToast(payload.new.title)
    }
  )
  .subscribe()
```

**Option 2: Custom WebSocket Server**
```typescript
// Server-side (Next.js API route or separate service)
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })
const userConnections = new Map<string, WebSocket>()

wss.on('connection', (ws, req) => {
  const userId = extractUserIdFromToken(req)
  userConnections.set(userId, ws)
  
  ws.on('close', () => {
    userConnections.delete(userId)
  })
})

// When notification created:
export async function sendNotificationToUser(userId: string, notification: any) {
  const ws = userConnections.get(userId)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'NOTIFICATION',
      payload: notification
    }))
  }
}
```

**Fallback: Polling**
- If WebSocket disconnected, poll every 30s
- `/api/notifications/count` - Get unread count
- `/api/notifications` - Get recent notifications

---

## 🛡️ PHASE 6: SECURITY & COMPLIANCE

### **6.1 Row Level Security (RLS)**

```sql
-- Users can only see their own notifications
CREATE POLICY notification_user_isolation
  ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Users can only modify their own preferences
CREATE POLICY preferences_user_isolation
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Only admins can modify org policies
CREATE POLICY policies_admin_only
  ON notification_policies
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );
```

---

### **6.2 GDPR/CCPA Compliance**

**Consent Management:**
```typescript
// User must opt-in for email/SMS
interface ConsentLog {
  user_id: string
  channel: 'email' | 'sms'
  consented_at: Date
  consent_ip: string
  consent_source: 'signup' | 'settings' | 'form'
}

// Right to access (export)
async function exportUserNotifications(userId: string): Promise<Blob> {
  const notifications = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
  
  return new Blob([JSON.stringify(notifications, null, 2)], {
    type: 'application/json'
  })
}

// Right to delete
async function deleteUserNotifications(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
}
```

**Data Retention:**
```sql
-- Auto-delete notifications older than retention period
CREATE OR REPLACE FUNCTION auto_delete_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron or external cron
SELECT cron.schedule(
  'delete-old-notifications',
  '0 2 * * *',  -- Daily at 2 AM
  $$SELECT auto_delete_old_notifications()$$
);
```

---

## 🧪 PHASE 7: TESTING & QA

### **7.1 E2E Test Flow**

```typescript
describe('Notifications E2E', () => {
  it('should deliver notification when deal assigned', async () => {
    // 1. Create user (assignee)
    const user = await createTestUser({ role: 'staff' })
    
    // 2. Assign deal to user
    const deal = await createDeal({ owner_user_id: user.id })
    
    // 3. Event should be emitted
    expect(eventBus.emitted('deal.assigned')).toBeTruthy()
    
    // 4. Notification should be created in DB
    const notification = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_key', 'deal.assigned')
      .single()
    
    expect(notification).toBeDefined()
    expect(notification.title).toBe('Deal assigned to you')
    
    // 5. Badge count should update
    const count = await getUnreadCount(user.id)
    expect(count).toBe(1)
    
    // 6. Email should be sent (if enabled)
    expect(emailMock).toHaveBeenCalledWith(
      user.email,
      'Deal assigned to you',
      expect.any(String)
    )
    
    // 7. Mark as read
    await markAsRead(notification.id)
    
    // 8. Badge count should decrease
    const newCount = await getUnreadCount(user.id)
    expect(newCount).toBe(0)
  })
})
```

---

### **7.2 Load Testing**

```yaml
# artillery.yml
config:
  target: 'https://your-app.com'
  phases:
    - duration: 60
      arrivalRate: 100  # 100 events/sec
scenarios:
  - name: 'Burst notifications'
    flow:
      - post:
          url: '/api/notifications/emit'
          json:
            event_key: 'deal.assigned'
            user_id: '{{ $randomString() }}'
            title: 'Test notification'
```

**Acceptance Criteria:**
- ✅ 1000 events/sec → all delivered within 5s
- ✅ Badge count updates within 500ms
- ✅ No UI jank (drawer stays responsive)
- ✅ No memory leaks (WebSocket connections)

---

## 📦 PHASE 8: DELIVERABLES

### **Complete Checklist:**

**✅ 1. Database Schema (4 tables):**
- notifications
- notification_preferences
- notification_policies
- notification_delivery_log

**✅ 2. UI Components (6 components):**
- Global bell button
- Notifications drawer
- Full notifications page
- User preferences UI
- Admin policies UI
- Inline quick actions

**✅ 3. Backend Services (5 services):**
- Event emitter
- Router/orchestrator
- Channel adapters (in-app, email, SMS)
- Real-time WebSocket service
- Preference resolver

**✅ 4. Event Catalog (60 events):**
- Deals & Pipeline (10)
- Contacts (5)
- Tasks (5)
- Marketing Campaigns (8)
- Marketing Audit (6)
- Analytics (5)
- Forms (4)
- Integrations (6)
- Settings & Security (4)
- AI & Automation (3)
- System/Incidents (4)

**✅ 5. Documentation:**
- This research doc
- API documentation
- User guide
- Admin guide

---

## 🗓️ PHASED ROADMAP

### **PHASE 0: QUICK WINS (Week 1)**

**Goal:** Replace mock data with real system

**Tasks:**
1. Create database schema (4 tables)
2. Replace notification-center.tsx (drawer instead of dropdown)
3. Add global bell button to app bar
4. Implement mark as read/unread
5. Gear icon → deep-link to settings

**Acceptance:**
- ✅ Bell button shows real count
- ✅ Drawer displays real notifications
- ✅ Mark as read works
- ✅ No breaking changes

---

### **PHASE 1: CORE SYSTEM (Week 2-3)**

**Goal:** Complete event catalog + routing

**Tasks:**
1. Build event catalog (60 events)
2. Implement router/orchestrator
3. Hook up producers (deal assigned, task created, etc.)
4. User preferences UI
5. Basic email channel (SendGrid)
6. Real-time WebSocket delivery

**Acceptance:**
- ✅ 60 events working end-to-end
- ✅ Users can configure preferences
- ✅ Email notifications sending
- ✅ Real-time updates in drawer

---

### **PHASE 2: CHANNELS & POLICY (Week 4)**

**Goal:** Multi-channel + governance

**Tasks:**
1. SMS channel (Twilio)
2. Admin policies UI
3. Role defaults
4. Escalation rules
5. DND & digests
6. Rate limiting & batching
7. Observability dashboards

**Acceptance:**
- ✅ SMS notifications working
- ✅ Admin policies enforced
- ✅ DND respects quiet hours
- ✅ Dashboards show health

---

### **PHASE 3: POLISH & SCALE (Week 5)**

**Goal:** Enterprise-grade finish

**Tasks:**
1. Threading & grouping
2. Advanced search & filters
3. Full notifications page
4. Bulk actions
5. Export/import
6. i18n (internationalization)
7. Load testing (1000 events/sec)

**Acceptance:**
- ✅ Handles 1000 events/sec
- ✅ Full page with advanced filters
- ✅ Bulk mark as read
- ✅ i18n for 3+ languages

---

## 🏆 SUCCESS CRITERIA

**100/100 Enterprise Score if:**

✅ **Coverage (15 pts):** 60+ events across all modules
✅ **UX (15 pts):** Beautiful drawer, full page, quick actions
✅ **Real-time (15 pts):** WebSocket updates < 500ms
✅ **Preferences (10 pts):** Per-event, per-channel, DND, digests
✅ **Multi-channel (10 pts):** In-app, email, SMS working
✅ **Routing (10 pts):** Role/location/preference-based
✅ **Security (10 pts):** RLS, opt-in, GDPR compliance
✅ **Observability (5 pts):** Health dashboards, logs
✅ **Performance (5 pts):** Handles 1000 events/sec
✅ **Testing (5 pts):** E2E, load, chaos tests pass

---

## 🎯 FINAL VERDICT

**Current State: 20/100**
- ❌ Prototype only (mock data)
- ❌ No persistence
- ❌ No real-time
- ❌ Limited events

**After Implementation: 100/100**
- ✅ 60+ events
- ✅ Multi-channel delivery
- ✅ Real-time WebSocket
- ✅ Deep preferences
- ✅ Admin governance
- ✅ Enterprise security
- ✅ World-class UX

---

# 🚀 **READY TO BUILD!**

**Next step:** Execute phased implementation with full precision.

**Estimated LOC:** ~3,500 lines
- Database: 4 migrations (~500 lines)
- Backend: 8 services (~1,200 lines)
- Frontend: 12 components (~1,500 lines)
- Documentation: 4 docs (~300 lines)

**Time estimate:** 5 weeks to 100/100

**Let's ship the best notifications system in the CRM industry!** 🎉

