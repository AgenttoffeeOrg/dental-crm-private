# 🛠️ INTEGRATION TROUBLESHOOTING RUNBOOKS

**Enterprise-grade troubleshooting guides for common integration issues**

---

## 🚨 **SEVERITY LEVELS**

- 🔴 **P0 - Critical**: Complete integration failure, revenue impact
- 🟠 **P1 - High**: Degraded performance, some data loss
- 🟡 **P2 - Medium**: Intermittent issues, no data loss
- 🟢 **P3 - Low**: Minor issues, cosmetic problems

---

## 🔴 **P0: SIGNATURE VERIFICATION FAILED**

### Symptoms
- Webhooks return 401 Unauthorized
- Error: "Invalid Twilio signature" or "Invalid Meta signature"
- Data not syncing from vendor

### Root Causes
1. **Wrong auth token** in environment variables
2. **URL mismatch** between webhook config and actual endpoint
3. **Man-in-the-middle** proxy modifying request
4. **Spoofing attempt** (security violation)

### Diagnosis

**Step 1: Check Logs**
```sql
SELECT * FROM integration_logs
WHERE integration_type = 'twilio_sms'
AND error_code = 'signature_verification_failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Step 2: Verify Auth Token**
```bash
# Twilio
echo $TWILIO_AUTH_TOKEN
# Should match Twilio Console → Account → Auth Token

# Meta
echo $META_APP_SECRET
# Should match Meta App Dashboard → Settings → App Secret
```

**Step 3: Check URL**
- Webhook URL in vendor console must EXACTLY match your endpoint
- Include protocol: `https://` (not http://)
- No trailing slash: `/api/webhooks/sms` not `/api/webhooks/sms/`
- Query params must be included in signature (Twilio)

### Resolution

**Option A: Fix Auth Token**
```bash
# Update environment variable
export TWILIO_AUTH_TOKEN=your_correct_token

# Restart app
npm run dev
```

**Option B: Regenerate Tokens**
1. Twilio Console → Settings → General → Auth Token → Regenerate
2. Update your `.env.local` file
3. Restart application

**Option C: Check Proxy/Load Balancer**
- If behind proxy, ensure it doesn't modify requests
- Twilio needs original request for signature
- Disable request buffering or transformation

### Prevention
- ✅ Use environment variables (never hardcode)
- ✅ Validate tokens on app startup
- ✅ Alert on 3+ verification failures in 1 hour
- ✅ Log all verification attempts

### SLA
- **Detection**: < 5 minutes (automatic alerts)
- **Resolution**: < 15 minutes
- **Escalation**: If not fixed in 30 min, page on-call

---

## 🟠 **P1: TOKEN EXPIRED**

### Symptoms
- API calls return 401 Unauthorized
- Integration status shows "error" (red badge)
- Error: "The access token expired" or "Invalid credentials"
- Last sync > 24 hours ago

### Root Causes
1. **Refresh token expired** (OAuth)
2. **Automatic refresh failed**
3. **Scopes revoked** by user
4. **Account suspended** by vendor

### Diagnosis

**Step 1: Check Token Expiry**
```sql
SELECT 
  integration_type,
  status,
  token_expires_at,
  EXTRACT(DAY FROM (token_expires_at - NOW())) as days_until_expiry,
  error_message
FROM integration_connections
WHERE token_expires_at < NOW() + INTERVAL '7 days'
ORDER BY token_expires_at;
```

**Step 2: Check Refresh Attempts**
```sql
SELECT * FROM integration_logs
WHERE operation = 'refresh_token'
AND status = 'error'
ORDER BY created_at DESC
LIMIT 10;
```

**Step 3: Verify Scopes**
- Check if user revoked app access
- Verify scopes in integration_connections.scopes match requirements

### Resolution

**Option A: Manual Reconnect**
1. Integration Health Dashboard → Click integration
2. Click "Reconnect" button
3. Complete OAuth flow again
4. New tokens saved automatically

**Option B: Manual Token Refresh**
```sql
-- Trigger immediate refresh
SELECT refresh_integration_token(
  connection_id,
  integration_type
) FROM integration_connections
WHERE id = 'your-connection-id';
```

**Option C: New Refresh Token**
1. Go to vendor's OAuth consent screen
2. Revoke access
3. Re-authorize app
4. Get new refresh token
5. Update integration_connections

### Prevention
- ✅ Background job monitors expiry daily
- ✅ Auto-refresh 7 days before expiry
- ✅ Alert if refresh fails
- ✅ "Expiring Soon" badge in dashboard

### SLA
- **Detection**: < 24 hours (background job)
- **Auto-recovery**: Immediate (background refresh)
- **Manual resolution**: < 1 hour
- **Escalation**: If impacts > 5% of tenants

---

## 🟡 **P2: RATE LIMIT EXCEEDED**

### Symptoms
- API calls return 429 Too Many Requests
- Error: "Rate limit exceeded"
- Slow response times
- Some requests failing

### Root Causes
1. **Burst traffic** (campaign launch, data import)
2. **Infinite loop** in code
3. **Multiple tenants** sharing quota
4. **Vendor tier** too low

### Diagnosis

**Step 1: Check Current Usage**
```sql
SELECT 
  integration_type,
  requests_count,
  requests_limit,
  (requests_count::float / requests_limit::float * 100) as usage_percent,
  reset_at
FROM integration_rate_limits
WHERE requests_count > (requests_limit * 0.8) -- Over 80% usage
ORDER BY usage_percent DESC;
```

**Step 2: Check for Loops**
```sql
-- Find integrations with unusually high request count
SELECT 
  integration_type,
  COUNT(*) as request_count,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY integration_type
HAVING COUNT(*) > 100
ORDER BY request_count DESC;
```

**Step 3: Identify Source**
```sql
-- Find which tenant is using the most quota
SELECT 
  tenant_id,
  integration_type,
  COUNT(*) as requests
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY tenant_id, integration_type
ORDER BY requests DESC
LIMIT 20;
```

### Resolution

**Option A: Wait for Reset**
- Check `reset_at` timestamp in error response
- Typical windows: 1 min (most APIs), 1 day (Google Ads)
- Inform user of wait time

**Option B: Implement Queuing**
```typescript
// Queue requests instead of failing
const queue = new PQueue({ concurrency: 10 })
await queue.add(() => apiCall())
```

**Option C: Upgrade Vendor Tier**
- Twilio: Upgrade to higher tier
- Google: Request quota increase
- Meta: Verified Business (higher limits)

**Option D: Optimize**
- Batch requests where possible
- Cache responses (reduce API calls)
- Use webhooks instead of polling

### Prevention
- ✅ Track quota usage in real-time
- ✅ Alert at 80% quota usage
- ✅ Implement request queuing
- ✅ Dashboard shows usage per integration

### SLA
- **Detection**: < 1 minute (automatic)
- **Resolution**: Immediate (queue) or wait for reset
- **Long-term**: Optimize or upgrade tier

---

## 🟡 **P2: DUPLICATE DATA**

### Symptoms
- Same contact created multiple times
- Duplicate activities
- Multiple deals for same lead

### Root Causes
1. **Vendor sent webhook twice** (normal behavior)
2. **Retry logic** created duplicate
3. **Race condition** (parallel requests)
4. **Idempotency failure**

### Diagnosis

**Step 1: Check Webhook Logs**
```sql
SELECT 
  external_id,
  COUNT(*) as occurrences,
  array_agg(status) as statuses,
  array_agg(created_at) as timestamps
FROM integration_webhooks_log
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

**Step 2: Find Duplicates**
```sql
-- Duplicate contacts
SELECT email, COUNT(*) as count
FROM contacts
GROUP BY email
HAVING COUNT(*) > 1;

-- Duplicate activities
SELECT external_id, COUNT(*) as count
FROM activities
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING COUNT(*) > 1;
```

### Resolution

**Option A: Already Handled (Idempotency)**
- System should auto-detect duplicates
- Check webhook log `status='processed'` for first occurrence
- Subsequent webhooks should return `duplicate=true`

**Option B: Clean Up Existing Duplicates**
```sql
-- Keep first, mark others
WITH ranked AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
  FROM contacts
  WHERE email IS NOT NULL
)
UPDATE contacts
SET tags = array_append(tags, 'duplicate')
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
```

**Option C: Merge Duplicates**
```typescript
// Use CRM merge contacts feature
// Navigate to contact → More → Merge with duplicate
```

### Prevention
- ✅ Idempotency via external_id + payload_hash
- ✅ UNIQUE constraints on critical fields
- ✅ Deduplication before insert
- ✅ Webhook log tracks all attempts

### SLA
- **Detection**: Immediate (UNIQUE constraint fails)
- **Prevention**: 100% (idempotency layer)
- **Cleanup**: Manual (rare edge cases)

---

## 🟡 **P2: WEBHOOK NOT RECEIVED**

### Symptoms
- Form submitted but no contact created
- Lead in Meta but not in CRM
- SMS sent but no activity logged

### Root Causes
1. **Webhook URL not configured** in vendor
2. **Firewall blocking** webhook requests
3. **HTTPS certificate** invalid
4. **App not running** (dev environment)

### Diagnosis

**Step 1: Check Vendor Webhook Config**
- Twilio: Console → Phone Numbers → Webhook URL
- Meta: App Dashboard → Webhooks → Subscriptions
- TikTok: Business API Portal → Webhooks

**Step 2: Test Webhook Endpoint**
```bash
# Test SMS webhook
curl -X GET https://your-domain.com/api/webhooks/sms

# Expected response:
# {"status":"ready","endpoint":"sms-webhook","message":"Enterprise-hardened SMS webhook ready"}
```

**Step 3: Check Firewall/Proxy**
- Verify vendor IPs are allowlisted
- Check Railway.app logs for rejected requests

**Step 4: Simulate Webhook**
```bash
# Test Twilio SMS webhook locally
curl -X POST http://localhost:3000/api/webhooks/sms \
  -d "MessageSid=SMtest123" \
  -d "From=+15555555555" \
  -d "To=+15555551234" \
  -d "Body=Test message"
```

### Resolution

**Option A: Configure Webhook URL**
1. Copy correct URL from deployment
2. Add to vendor's webhook configuration
3. Test with vendor's webhook testing tool

**Option B: Check HTTPS**
- Railway.app provides automatic HTTPS
- Verify certificate is valid: https://www.ssllabs.com/ssltest/

**Option C: Manual Sync**
- Fetch data directly from vendor API
- Process manually via admin panel
- One-time backfill for missed data

### Prevention
- ✅ Webhook endpoint health checks
- ✅ Monitor webhook receipt rates
- ✅ Alert if no webhooks for > 1 hour
- ✅ Fallback: Scheduled polling

### SLA
- **Detection**: < 1 hour (monitoring)
- **Resolution**: < 4 hours
- **Backfill**: < 24 hours for missed data

---

## 🟢 **P3: SLOW API RESPONSE**

### Symptoms
- API calls taking > 5 seconds
- Timeouts (30s+)
- User complaints about sluggishness

### Root Causes
1. **Vendor API degraded**
2. **Database query slow** (missing index)
3. **Large payload** (pagination needed)
4. **Network latency**

### Diagnosis

**Step 1: Check API Duration**
```sql
SELECT 
  integration_type,
  operation,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as total_calls
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY integration_type, operation
HAVING AVG(duration_ms) > 3000 -- Slower than 3s
ORDER BY avg_duration DESC;
```

**Step 2: Check Vendor Status**
- Twilio: https://status.twilio.com/
- Meta: https://developers.facebook.com/status/
- Google: https://status.cloud.google.com/

**Step 3: Database Performance**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%integration%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Resolution

**Option A: Add Timeout**
```typescript
// Add timeout to API calls
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10000)

const response = await fetch(url, { signal: controller.signal })
clearTimeout(timeout)
```

**Option B: Use Pagination**
```typescript
// Fetch in smaller batches
const pageSize = 100
for (let page = 0; page < totalPages; page++) {
  const data = await fetchPage(page, pageSize)
  await processData(data)
}
```

**Option C: Background Processing**
- Move slow operations to background jobs
- Return immediately to user
- Process async via queue

### Prevention
- ✅ Monitor P95/P99 latency
- ✅ Set SLO: 95% of requests < 2s
- ✅ Alert if P95 > 5s
- ✅ Cache frequent requests

### SLA
- **Target latency**: P95 < 2s, P99 < 5s
- **Detection**: < 5 minutes
- **Resolution**: < 1 hour

---

## 🟡 **P2: DATA NOT SYNCING**

### Symptoms
- Contact exists in vendor but not in CRM
- Metrics in GA4 but not in Marketing Audit
- Form submission not creating contact

### Root Causes
1. **Webhook not configured**
2. **Mapping missing** (field not mapped)
3. **Validation failure** (e.g., invalid email)
4. **Silent error** (logged but not alerted)

### Diagnosis

**Step 1: Check Webhook Logs**
```sql
SELECT * FROM integration_webhooks_log
WHERE status = 'failed'
OR error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Step 2: Check Integration Logs**
```sql
SELECT * FROM integration_logs
WHERE status = 'error'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Step 3: Check DLQ**
```sql
SELECT * FROM integration_dlq
WHERE status IN ('pending', 'failed')
ORDER BY first_failed_at DESC;
```

### Resolution

**Option A: Replay from DLQ**
1. DLQ Replay Dashboard → Find failed item
2. Click "Retry Now"
3. Verify contact/deal created

**Option B: Manual Data Entry**
1. Copy data from vendor
2. Create contact manually
3. Link to original source (notes field)

**Option C: Backfill**
```typescript
// Fetch historical data from vendor
const leads = await fetchMetaLeads({ since: '2025-01-01' })
for (const lead of leads) {
  await processLead(lead)
}
```

### Prevention
- ✅ Alert on webhook processing failures
- ✅ DLQ replay automation
- ✅ Reconciliation job (vendor vs CRM)
- ✅ Data quality dashboard

### SLA
- **Detection**: < 1 hour
- **Resolution**: < 4 hours
- **Backfill**: < 24 hours

---

## 🟢 **P3: HIGH RETRY RATE**

### Symptoms
- Many items in DLQ
- Retry count > 3 for multiple items
- Integration Health shows degraded status

### Root Causes
1. **Transient vendor issues** (5xx errors)
2. **Network instability**
3. **Database connection pool exhaustion**
4. **Validation errors** (should not retry)

### Diagnosis

**Step 1: Analyze Retry Patterns**
```sql
SELECT 
  integration_type,
  operation,
  error_code,
  COUNT(*) as occurrence_count,
  AVG(retry_count) as avg_retries
FROM integration_dlq
WHERE first_failed_at > NOW() - INTERVAL '24 hours'
GROUP BY integration_type, operation, error_code
ORDER BY occurrence_count DESC;
```

**Step 2: Check if Retryable**
- 4xx errors (except 429): Should NOT retry
- 5xx errors: Should retry
- Network errors: Should retry

### Resolution

**Option A: Fix Validation**
- If 400 errors, fix validation logic
- Don't retry non-retryable errors
- Add to error handling

**Option B: Increase Retry Delay**
```typescript
// Longer delays for vendor issues
const delays = [2000, 5000, 10000, 30000, 60000]
```

**Option C: Circuit Breaker**
- If vendor has > 50% error rate
- Stop sending requests
- Wait 5 minutes
- Gradually resume

### Prevention
- ✅ Smart retry logic (isRetryableError)
- ✅ Exponential backoff
- ✅ Circuit breaker pattern
- ✅ Vendor status page integration

### SLA
- **Detection**: < 15 minutes
- **Resolution**: Automatic or < 2 hours
- **Review**: Weekly for patterns

---

## 🔧 **DEBUGGING TOOLS**

### Correlation ID Lookup
```sql
-- Trace entire request flow
SELECT * FROM integration_logs
WHERE correlation_id = 'your-correlation-id-here'
ORDER BY created_at;
```

### Integration Health Check
```bash
curl http://localhost:3000/api/integrations/health
```

### Webhook Test
```bash
# Send test webhook with valid signature
# (Use vendor's test tool or Postman)
```

### Database Queries
```sql
-- Active connections
SELECT * FROM integration_connections
WHERE is_active = true;

-- Recent errors
SELECT * FROM integration_logs
WHERE status = 'error'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Pending DLQ items
SELECT * FROM integration_dlq
WHERE status = 'pending'
ORDER BY next_retry_at;
```

---

## 📞 **ESCALATION MATRIX**

| Severity | Initial Response | Escalation | On-Call |
|----------|-----------------|------------|---------|
| **P0** | < 15 min | 30 min | Yes |
| **P1** | < 1 hour | 4 hours | Business hours |
| **P2** | < 4 hours | Next day | No |
| **P3** | < 24 hours | None | No |

---

## ✅ **POST-INCIDENT CHECKLIST**

After resolving any integration issue:

1. **Document Root Cause**
   - What happened?
   - Why did it happen?
   - How was it detected?

2. **Verify Resolution**
   - Test end-to-end flow
   - Check metrics normalized
   - Confirm no data loss

3. **Update Runbook**
   - Add learnings
   - Update resolution steps
   - Add prevention measures

4. **Communicate**
   - Notify affected users (if any)
   - Update status page
   - Post-mortem if P0/P1

5. **Prevent Recurrence**
   - Add monitoring/alerts
   - Implement fix
   - Add tests

---

**Remember**: All integration errors are logged with correlation IDs for easy tracing!

Use the Integration Health Dashboard for real-time visibility into all issues.

