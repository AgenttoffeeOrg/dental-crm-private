# Marketing Audit API - Complete Endpoint Reference

## Base URL
```
Production: https://yourdomain.com/api/marketing-audit
Development: http://localhost:3000/api/marketing-audit
```

---

## Authentication

All endpoints require authentication via Supabase Auth.

```typescript
headers: {
  'Authorization': 'Bearer {supabase_access_token}'
}
```

---

## Endpoints

### 1. Run New Audit

**Trigger a marketing audit for the current practice.**

```http
POST /api/marketing-audit/run
```

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "audit_id": "uuid",
  "status": "running",
  "message": "Audit started. This will take 2-3 minutes.",
  "estimated_completion": "2025-01-15T10:15:00Z"
}
```

**Status Codes:**
- `200` - Audit started successfully
- `401` - Unauthorized
- `404` - Practice not found
- `400` - Practice domain not configured
- `500` - Server error

---

### 2. Get Latest Audit

**Retrieve the most recent completed audit.**

```http
GET /api/marketing-audit/latest
```

**Response:**
```json
{
  "audit": {
    "id": "uuid",
    "composite_score": 78.4,
    "technical_score": 85.2,
    "local_score": 72.0,
    "content_score": 60.5,
    "analytics_score": 88.0,
    "conversion_score": 92.0,
    "percentile_rank": 65.3,
    "your_rank": 5,
    "peer_count": 12,
    "recommendations": [...],
    "competitors": [...],
    "alerts": [...],
    "metrics": [...]
  }
}
```

---

### 3. Get Audit History

**Retrieve paginated audit history.**

```http
GET /api/marketing-audit/history?limit=10&offset=0
```

**Query Parameters:**
- `limit` (optional, default: 10) - Number of results
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "audits": [...],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

---

### 4. Get Specific Audit

**Retrieve a specific audit by ID.**

```http
GET /api/marketing-audit/{audit_id}
```

**Response:** Same as latest audit

---

### 5. Delete Audit

**Delete a specific audit.**

```http
DELETE /api/marketing-audit/{audit_id}
```

**Response:**
```json
{
  "success": true
}
```

---

### 6. Create Task from Recommendation

**Create a CRM task from an audit recommendation.**

```http
POST /api/marketing-audit/{audit_id}/recommendations/{rec_id}/create-task
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "title": "Fix 7 Index Coverage Errors",
    "description": "...",
    "priority": "high"
  },
  "message": "Task created successfully"
}
```

---

### 7. Dismiss Recommendation

**Mark a recommendation as dismissed.**

```http
PATCH /api/marketing-audit/{audit_id}/recommendations/{rec_id}/dismiss
```

**Request Body:**
```json
{
  "reason": "Already implemented" 
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": {...}
}
```

---

### 8. Get Competitors

**Retrieve competitor data for an audit.**

```http
GET /api/marketing-audit/competitors?auditId={audit_id}
```

**Query Parameters:**
- `auditId` (optional) - Specific audit ID. If omitted, uses latest audit.

**Response:**
```json
{
  "competitors": [...],
  "total": 20
}
```

---

### 9. Get Metrics

**Retrieve detailed metrics for an audit.**

```http
GET /api/marketing-audit/{audit_id}/metrics?category=technical
```

**Query Parameters:**
- `category` (optional) - Filter by category (technical|local|content|analytics|conversion)

**Response:**
```json
{
  "metrics": [...],
  "grouped": {
    "technical": [...],
    "local": [...]
  },
  "total": 50
}
```

---

### 10. Get Recommendations

**Retrieve recommendations for an audit.**

```http
GET /api/marketing-audit/{audit_id}/recommendations?status=pending&category=technical_seo
```

**Query Parameters:**
- `status` (optional) - Filter by status (pending|in_progress|completed|dismissed)
- `category` (optional) - Filter by category

**Response:**
```json
{
  "recommendations": [...],
  "stats": {
    "total": 20,
    "by_impact": {
      "high": 8,
      "medium": 10,
      "low": 2
    },
    "by_status": {
      "pending": 15,
      "in_progress": 3,
      "completed": 1,
      "dismissed": 1
    },
    "total_estimated_hours": 67.5
  }
}
```

---

### 11. Get Alerts

**Retrieve alerts for the current practice.**

```http
GET /api/marketing-audit/alerts?acknowledged=false
```

**Query Parameters:**
- `acknowledged` (optional) - Filter by acknowledged status

**Response:**
```json
{
  "alerts": [...],
  "total": 3
}
```

---

### 12. Acknowledge Alert

**Mark an alert as acknowledged.**

```http
PATCH /api/marketing-audit/alerts/{alert_id}/acknowledge
```

**Response:**
```json
{
  "success": true,
  "alert": {...}
}
```

---

### 13. Initiate Google OAuth

**Start OAuth flow for Google APIs.**

```http
POST /api/marketing-audit/oauth/google/initiate
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state_string",
  "message": "Please visit the authorization URL to grant access"
}
```

**Usage:**
1. Call this endpoint
2. Redirect user to `authUrl`
3. User authorizes
4. Google redirects to callback

---

### 14. Google OAuth Callback

**Handle OAuth callback from Google.**

```http
GET /api/marketing-audit/oauth/google/callback?code={code}&state={state}
```

**This is called automatically by Google after user authorizes.**

**Response:** Redirects to `/marketing-audit?oauth=success`

---

## Error Responses

All endpoints use standardized error format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {...},
  "timestamp": "2025-01-15T10:00:00Z"
}
```

**Common Error Codes:**
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (wrong tenant)
- `404` - Resource not found
- `400` - Bad request (validation failed)
- `429` - Rate limit exceeded
- `500` - Server error

---

## Rate Limits

**Per practice:**
- 10 audits per day (prevents abuse)
- 100 API requests per hour (general limit)

**Global (all practices):**
- Managed by connector rate limiters
- Respects Google API quotas
- Automatic throttling

---

## Webhooks (Phase 2)

**Coming soon:**
- `audit.completed` - Fired when audit finishes
- `audit.regression_detected` - Fired when score drops >5 points
- `recommendation.completed` - Fired when task marked complete

---

## SDK Usage Example

```typescript
// Initialize
const auditClient = new MarketingAuditClient(supabaseClient);

// Run audit
const { audit_id } = await auditClient.runAudit();

// Poll for completion
const audit = await auditClient.pollUntilComplete(audit_id);

// Get recommendations
const recs = await auditClient.getRecommendations(audit_id, {
  status: 'pending',
  impact: 'high',
});

// Create task
const task = await auditClient.createTaskFromRecommendation(audit_id, rec_id);
```

---

**Version:** 1.0  
**Last Updated:** January 16, 2025

