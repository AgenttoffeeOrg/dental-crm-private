# 🔧 INTEGRATIONS ENTERPRISE HARDENING - COMPLETE PLAN

**Date:** January 16, 2025  
**Status:** 🚀 Ready to Execute  
**Total Tasks:** 51  
**Estimated Duration:** 2-3 weeks for full completion

---

## 📊 CURRENT STATE vs TARGET

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Integration Breadth | 20+ integrations | 20+ | ✅ Good |
| Webhook Security | No signature verification | 100% verified | 🔴 Critical |
| Idempotency | Not implemented | 100% coverage | 🔴 Critical |
| Rate Limiting | Basic (1 file) | Per-integration limits | 🟡 Needs work |
| Token Management | Manual | Auto-refresh | 🔴 Critical |
| Observability | Console.log only | Full dashboards | 🔴 Major gap |
| Retry Logic | None | Exponential backoff + DLQ | 🔴 Critical |
| Field Mapping UX | Forms only | All integrations | 🟡 Partial |
| Testing | None | Contract tests + E2E | 🔴 Major gap |
| Documentation | Inline only | Full runbooks | 🟡 Needs work |

**Overall Enterprise Readiness: 53% → Target: 95%+**

---

## 🎯 PHASE 0: CRITICAL FOUNDATION (Tasks 1-14)

**Goal:** Fix security vulnerabilities and data integrity issues  
**Duration:** 3-4 days  
**Impact:** Prevents data loss, security breaches

### Database Schema (Tasks 1-5)

**1. integration_connections table**
- Purpose: Central source of truth for all integration credentials
- Fields: tenant_id, integration_type, status, credentials (encrypted), scopes, token_expires_at, last_sync_at, error_message
- RLS: Tenant isolation
- Indexes: (tenant_id, integration_type), token_expires_at

**2. integration_logs table**
- Purpose: Audit trail for every API call
- Fields: tenant_id, integration_type, operation, status, request_payload, response_payload, error_message, duration_ms
- Retention: 90 days rolling
- Indexes: (tenant_id, created_at DESC), (integration_type, status)

**3. integration_rate_limits table**
- Purpose: Track API quota usage per integration
- Fields: tenant_id, integration_type, window_start, requests_count, limit, reset_at
- Updates: Increment on every API call
- Cleanup: Delete records older than 24h

**4. integration_webhooks_log table**
- Purpose: Deduplication of webhook events
- Fields: tenant_id, integration_type, external_id, payload_hash, processed_at, status
- Indexes: UNIQUE (integration_type, external_id), payload_hash
- Cleanup: Delete after 30 days

**5. RLS Policies**
- All tables: Tenant isolation via tenant_id
- Read: Users can only see their tenant's data
- Write: Service role only for logs
- Security: Encrypted credentials column

### Webhook Security (Tasks 6-9)

**6-8. Twilio Signature Verification**
- SMS webhook: Validate X-Twilio-Signature using Twilio's auth token
- WhatsApp webhook: Same HMAC validation
- Voice webhook: Same HMAC validation
- Implementation: Create `verifyTwilioSignature()` utility
- Reject: Return 401 if signature invalid

**9. Meta Signature Verification**
- Facebook/Instagram webhooks: Validate X-Hub-Signature-256
- Implementation: Create `verifyMetaSignature()` utility
- Use: App Secret from environment
- Reject: Return 401 if invalid

### Idempotency (Tasks 10-12)

**10. Idempotency Middleware**
- Create: `withIdempotency()` wrapper for webhook handlers
- Logic: Hash (integration_type + external_id + tenant_id)
- Check: Query integration_webhooks_log for existing hash
- Action: Skip processing if already processed, return 200

**11. Deduplication Logic**
- Before: Insert into activities/contacts/deals
- Check: Does external_id already exist?
- Skip: If yes, return success (idempotent)
- Log: All dedup events to integration_logs

**12. Idempotency Headers (Outbound)**
- Add: `Idempotency-Key: UUID` to all POST/PUT/PATCH requests
- Store: Key in integration_logs with request
- Retry: Use same key if retrying
- Vendors: Stripe, Twilio honor this header

### Rate Limiting (Tasks 13-16)

**13. Rate Limiter Utility**
- Implementation: Extend existing `rate-limiter.ts`
- Backend: Redis (ioredis)
- Algorithm: Sliding window
- Config: Per-integration limits (e.g., Twilio: 100/min, Meta: 200/min)

**14. Per-Integration Configs**
```typescript
const RATE_LIMITS = {
  twilio_sms: { requests: 100, window: 60000 },
  twilio_voice: { requests: 60, window: 60000 },
  meta_graph: { requests: 200, window: 60000 },
  google_ads: { requests: 10000, window: 86400000 },
}
```

---

## 🚀 PHASE 1: RELIABILITY & OBSERVABILITY (Tasks 17-29)

**Goal:** Add retry logic, token management, health monitoring  
**Duration:** 5-7 days  
**Impact:** 99.9% uptime, automatic recovery

### Retry Logic & DLQ (Tasks 17-20)

**17. Retry Utility**
```typescript
async function retryWithBackoff(
  operation: () => Promise<any>,
  maxRetries = 5
) {
  const delays = [1000, 2000, 4000, 8000, 16000] // Exponential
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(delays[i])
    }
  }
}
```

**18. Dead Letter Queue Table**
```sql
CREATE TABLE integration_dlq (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  integration_type TEXT,
  operation TEXT,
  payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  status TEXT, -- 'pending', 'retrying', 'failed', 'resolved'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**19. Automatic Retry**
- Background job: Every 5 minutes
- Query: DLQ items with status='pending' and retry_count < 5
- Process: Attempt operation with exponential backoff
- Update: Increment retry_count, set last_retry_at
- Move: To 'failed' if retry_count >= 5

**20. Manual Replay UI**
- Location: Settings → Integrations → Failed Webhooks
- Table: Show DLQ items with error details
- Actions: Retry, Discard, View Payload
- Bulk: Retry all failed items for an integration

### Token Management (Tasks 21-24)

**21. Token Refresh Utility**
```typescript
async function refreshOAuthToken(
  connectionId: string,
  refreshToken: string,
  provider: 'google' | 'meta' | 'linkedin'
) {
  // Provider-specific OAuth refresh logic
  const newToken = await fetch(...)
  await supabase
    .from('integration_connections')
    .update({
      credentials: encrypt(newToken),
      token_expires_at: new Date(Date.now() + 3600000)
    })
    .eq('id', connectionId)
}
```

**22. Background Job**
- Schedule: Daily at 2 AM
- Query: integration_connections WHERE token_expires_at < NOW() + INTERVAL '7 days'
- Action: Call refreshOAuthToken() for each
- Log: All refresh attempts to integration_logs
- Alert: If refresh fails, notify admins

**23. Automatic Refresh**
- Trigger: On API call if token expires in < 24 hours
- Inline: Refresh before making actual API call
- Update: New token and expiry in database
- Fallback: If refresh fails, mark connection as 'error'

**24. Token Expiry Alerts**
- Dashboard: Show integration_connections expiring in < 7 days
- Badge: Yellow "Expiring Soon" on integration card
- Email: Daily digest of expiring tokens
- Action: "Reconnect" button to re-OAuth

### Integration Health Dashboard (Tasks 25-29)

**25. Health Dashboard Component**
- Location: Settings → Integrations → Health
- Layout: Grid of integration cards
- Per card: Status, last sync, success rate, error count
- Refresh: Real-time updates every 30s

**26. Success/Error Rate Charts**
- Query: integration_logs grouped by (integration_type, status, date)
- Chart: Line chart showing success % over last 7/30 days
- Threshold: Alert if success rate < 95%
- Breakdown: By operation type (send_sms, receive_webhook, etc.)

**27. Last Sync Indicators**
- Query: MAX(created_at) from integration_logs WHERE status='success'
- Display: "Last synced 5 minutes ago" (human-readable)
- Alert: If no successful call in > 24 hours

**28. Status Badges**
- Connected: Green, all systems operational
- Degraded: Yellow, success rate 90-95% or token expiring
- Error: Red, success rate < 90% or token expired
- Disconnected: Gray, no credentials stored

**29. Real-Time Health API**
```typescript
GET /api/integrations/health
Response: {
  integrations: [{
    type: 'twilio_sms',
    status: 'connected',
    last_sync: '2025-01-16T10:30:00Z',
    success_rate_24h: 98.5,
    error_count_24h: 3,
    token_expires_at: '2025-02-15T00:00:00Z'
  }]
}
```

---

## 🎨 PHASE 2: UX & ADVANCED FEATURES (Tasks 30-43)

**Goal:** Field mapping, scheduled syncs, sandbox mode  
**Duration:** 6-8 days  
**Impact:** Better data quality, easier setup

### Field Mapping (Tasks 30-35)

**30. Unified Field Mapping Component**
- Reuse: `field-mapping-editor.tsx` from forms
- Props: sourceFields (from integration), targetFields (CRM), onSave
- UI: Drag-and-drop mapping, dropdown for each source field
- Validation: Ensure required fields are mapped

**31-34. Integration-Specific Mappers**
- Meta Lead Ads: Map Meta form fields → Contact/Deal
- Google Ads: Map Google lead extension fields → Contact/Deal
- TikTok: Map TikTok lead form fields → Contact/Deal
- Store: Mapping config in integration_connections.mapping_config JSONB

**35. Database Storage**
```sql
ALTER TABLE integration_connections
ADD COLUMN mapping_config JSONB DEFAULT '{}';

-- Example:
mapping_config: {
  "full_name": "contacts.full_name",
  "email": "contacts.primary_email",
  "phone": "contacts.primary_phone",
  "company": "contacts.company",
  "budget": "deals.value",
  "service": "deals.tags"
}
```

### Scheduled Sync Jobs (Tasks 36-40)

**36. Sync Job Framework**
```typescript
// src/lib/integrations/sync-scheduler.ts
class SyncScheduler {
  async scheduleJob(
    integration: string,
    frequency: 'hourly' | 'daily' | 'weekly',
    operation: () => Promise<void>
  ) {
    // Use pg_cron or external scheduler
  }
}
```

**37. GA4 Historical Sync**
- Schedule: Daily at 3 AM
- Operation: Fetch GA4 data for yesterday
- Store: In marketing_audit_metrics or dedicated GA4 table
- Incremental: Only new data, not full snapshot

**38. GSC Performance Backfill**
- Schedule: Daily at 4 AM
- Operation: Fetch GSC data for last 30 days
- Incremental: Compare with existing data, update if changed
- Limit: 1000 rows per request (Google limit)

**39. GBP Reviews Sync**
- Schedule: Every 6 hours
- Operation: Fetch new reviews since last sync
- Store: In local_presence_reviews table
- Alert: If new review has rating < 3

**40. Conflict Resolution**
- Strategy: Last-write-wins for most fields
- Exception: Never overwrite manually edited data
- Flag: Mark records with `sync_conflict` = true
- UI: Show conflicts for manual resolution

### Sandbox Mode (Tasks 41-43)

**41. Test/Prod Toggle**
- UI: Settings → Integrations → Each integration
- Toggle: "Use Test Mode" checkbox
- Storage: integration_connections.is_test_mode BOOLEAN
- Route: If test mode, use sandbox credentials & URLs

**42. Separate Test Credentials**
```typescript
// Twilio
test: {
  accountSid: 'ACtest...',
  authToken: 'test_token',
  phoneNumber: '+15005550006' // Twilio magic test number
}
// Meta
test: {
  appId: 'test_app_id',
  appSecret: 'test_secret',
  apiVersion: 'v18.0-sandbox'
}
```

**43. Visual Test Indicators**
- Badge: "TEST MODE" in orange on all test data
- Background: Light yellow tint on test records
- Alert: "You are in test mode" banner at top
- Confirm: Before switching to production

---

## 🔒 PHASE 3: SECURITY & COMPLIANCE (Tasks 44-47)

**Goal:** Encrypt tokens, prevent attacks, comply with SOC2  
**Duration:** 3-4 days  
**Impact:** Pass security audits, protect customer data

**44. Encrypt Tokens at Rest**
- Use: Supabase Vault (built-in encryption)
- Migration: Encrypt existing plaintext tokens
- Access: Only via service role, never exposed to client

**45. IP Allowlisting**
- Twilio: https://www.twilio.com/docs/usage/webhooks/webhooks-security#ip-addresses
- Meta: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#ip-addresses
- Implementation: Middleware to check req.headers['x-forwarded-for']

**46. Replay Attack Prevention**
- Timestamp: Check X-Twilio-Timestamp or similar
- Window: Reject if > 5 minutes old
- Nonce: Store processed webhook IDs in cache (Redis, 1-hour TTL)

**47. HTTPS-Only**
- Middleware: Redirect HTTP → HTTPS
- Strict-Transport-Security: Header with max-age=31536000
- Certificate: Railway.app handles this automatically

---

## 📚 PHASE 4: DOCUMENTATION & TESTING (Tasks 48-51)

**Goal:** Enable self-service, prevent regressions  
**Duration:** 2-3 days  
**Impact:** Reduced support burden, higher quality

**48. Setup Guides**
- Per integration: Step-by-step OAuth setup
- Screenshots: Visual guide for finding credentials
- Example: "How to get your Twilio Account SID"

**49. Troubleshooting Runbooks**
- Common errors: "Token expired", "Rate limit exceeded"
- Resolution: Steps to fix each error
- Escalation: When to contact support

**50. API Documentation**
- Custom integration API: POST /api/integrations/custom/webhook
- Authentication: API key or JWT
- Payload: JSON schema for each event type

**51. Testing (Not included in 51 tasks, but critical)**
- Contract tests: Pact for each integration
- E2E tests: Full workflow tests per integration
- Load tests: 1000 webhooks/min sustained
- Chaos tests: Network failures, 429s, token expiry

---

## 📊 SUCCESS METRICS

### Before Hardening
- Webhook Success Rate: Unknown (no logging)
- Token Failures: Frequent manual re-auth
- Rate Limit Hits: Unknown
- Data Duplication: Occurs sometimes
- Mean Time to Detect: Hours to days
- Mean Time to Resolve: Hours

### After Hardening (Target)
- Webhook Success Rate: 99.9%+
- Token Failures: 0 (auto-refresh)
- Rate Limit Hits: 0 (throttling)
- Data Duplication: 0 (idempotency)
- Mean Time to Detect: < 5 minutes (alerts)
- Mean Time to Resolve: < 15 minutes (runbooks)

---

## 🚀 EXECUTION PLAN

### Week 1: Foundation
- Days 1-2: Database schema (Tasks 1-5)
- Days 3-4: Webhook security (Tasks 6-9)
- Day 5: Idempotency (Tasks 10-12)

### Week 2: Reliability
- Days 1-2: Rate limiting (Tasks 13-16)
- Days 3-4: Retry & DLQ (Tasks 17-20)
- Day 5: Token management (Tasks 21-24)

### Week 3: Observability & UX
- Days 1-2: Health dashboard (Tasks 25-29)
- Days 3-4: Field mapping (Tasks 30-35)
- Day 5: Scheduled syncs (Tasks 36-40)

### Week 4: Security & Polish
- Days 1-2: Sandbox mode (Tasks 41-43)
- Days 2-3: Security hardening (Tasks 44-47)
- Days 4-5: Documentation (Tasks 48-51)

---

## ✅ ACCEPTANCE CRITERIA

**Each task must:**
1. Have passing tests (unit + integration)
2. Be documented (inline comments + runbook entry)
3. Be reviewed for security (no exposed secrets)
4. Follow existing code patterns (consistency)
5. Include error handling (try/catch + logging)
6. Be non-breaking (feature flags where needed)
7. Be deployable independently (no dependencies on future tasks)

**Phase completion requires:**
- All tasks in phase marked "completed"
- No linter errors
- No test failures
- Demo of key features working
- Documentation updated

---

## 🎯 READY TO START

**Next Step:** Execute tasks 1-5 (Database Schema)

**Approach:**
1. Mark task as "in_progress"
2. Implement with precision
3. Test thoroughly
4. Mark as "completed"
5. Move to next task

**Let's build enterprise-grade integrations!** 🚀

