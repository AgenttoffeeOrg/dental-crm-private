# 🔌 CUSTOM INTEGRATION API DOCUMENTATION

**Build custom integrations with the Dental CRM**

---

## 📖 **OVERVIEW**

The Dental CRM provides REST APIs for custom integrations, allowing you to:
- Send data to the CRM from external systems
- Retrieve CRM data for use in other applications
- Subscribe to real-time events via webhooks
- Build custom marketing automations

**Base URL:** `https://your-domain.com/api`

**Authentication:** Bearer token (JWT) or API Key

---

## 🔐 **AUTHENTICATION**

### Method 1: API Key (Recommended for Server-to-Server)

```bash
curl -X POST https://your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"full_name": "John Doe", "email": "john@example.com"}'
```

**Get API Key:**
1. Settings → Integrations → API Keys
2. Click "Generate New API Key"
3. Copy and store securely (shown only once)

### Method 2: OAuth 2.0 (For User-Facing Apps)

**OAuth Flow:**
```
1. https://your-domain.com/oauth/authorize?
   client_id=YOUR_CLIENT_ID&
   redirect_uri=https://yourapp.com/callback&
   response_type=code&
   scope=contacts:read contacts:write deals:read deals:write

2. User authorizes your app

3. Exchange code for access token:
   POST /oauth/token
   {
     "grant_type": "authorization_code",
     "code": "auth_code_here",
     "client_id": "YOUR_CLIENT_ID",
     "client_secret": "YOUR_CLIENT_SECRET",
     "redirect_uri": "https://yourapp.com/callback"
   }

4. Use access token in requests:
   Authorization: Bearer ACCESS_TOKEN
```

---

## 📥 **INBOUND WEBHOOKS (Send Data TO CRM)**

### **POST /api/integrations/custom/webhook**

Send data from external systems to create/update CRM records.

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
X-Webhook-Signature: sha256=HMAC_SIGNATURE (optional but recommended)
X-Idempotency-Key: unique_key_123 (recommended)
```

**Request Body:**
```json
{
  "event_type": "contact.created",
  "source": "your_system_name",
  "data": {
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+15555555555",
    "company": "Acme Corp",
    "source": "website_form",
    "tags": ["hot_lead", "consultation_request"]
  },
  "metadata": {
    "campaign_id": "summer_promo_2025",
    "utm_source": "google",
    "utm_campaign": "dental_implants"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "contact_id": "uuid-here",
  "created": true,
  "idempotent": false,
  "correlation_id": "correlation-uuid"
}
```

**Response (Idempotent - Already Processed):**
```json
{
  "success": true,
  "contact_id": "existing-uuid",
  "created": false,
  "idempotent": true,
  "cached_at": "2025-01-16T10:30:00Z"
}
```

**Event Types:**
- `contact.created` - Create new contact
- `contact.updated` - Update existing contact
- `deal.created` - Create new deal
- `deal.updated` - Update deal
- `task.created` - Create task
- `form.submitted` - Process form submission
- `call.received` - Log incoming call

---

## 📤 **OUTBOUND WEBHOOKS (Receive Data FROM CRM)**

Subscribe to CRM events and receive webhooks when things happen.

### **Configure Webhook Endpoint**

Settings → Integrations → Webhooks → Add Webhook

**Your Endpoint Requirements:**
- HTTPS only
- Respond within 10 seconds
- Return 200 OK for success
- Implement retry logic for failures

### **Webhook Payload Structure**

```json
{
  "event_id": "uuid",
  "event_type": "contact.created",
  "tenant_id": "uuid",
  "timestamp": "2025-01-16T10:30:00Z",
  "data": {
    "id": "contact-uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+15555555555",
    "source": "website",
    "created_at": "2025-01-16T10:30:00Z"
  },
  "metadata": {
    "user_id": "uuid-of-user-who-created",
    "ip_address": "1.2.3.4"
  }
}
```

### **Signature Verification (Your Side)**

We sign all outbound webhooks with HMAC-SHA256:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, f"sha256={expected}")

# Usage
is_valid = verify_webhook(
    request.body,
    request.headers['X-CRM-Signature'],
    YOUR_WEBHOOK_SECRET
)
```

### **Available Events**

| Event Type | Description | Frequency |
|------------|-------------|-----------|
| `contact.created` | New contact added | Real-time |
| `contact.updated` | Contact modified | Real-time |
| `contact.deleted` | Contact archived | Real-time |
| `deal.created` | New deal created | Real-time |
| `deal.updated` | Deal stage/value changed | Real-time |
| `deal.won` | Deal marked as won | Real-time |
| `deal.lost` | Deal marked as lost | Real-time |
| `task.created` | New task added | Real-time |
| `task.completed` | Task marked complete | Real-time |
| `form.submitted` | Form filled out | Real-time |
| `email.sent` | Marketing email sent | Real-time |
| `email.opened` | Email opened | Real-time |
| `email.clicked` | Link in email clicked | Real-time |
| `sms.sent` | SMS sent | Real-time |
| `sms.delivered` | SMS delivered | Real-time |
| `call.initiated` | Outbound call started | Real-time |
| `call.completed` | Call ended | Real-time |

---

## 🔍 **REST API ENDPOINTS**

### **Contacts API**

**GET /api/contacts**
```bash
curl -X GET "https://your-domain.com/api/contacts?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "contacts": [{
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+15555555555",
    "source": "website",
    "tags": ["hot_lead"],
    "created_at": "2025-01-15T10:00:00Z"
  }],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**POST /api/contacts**
```bash
curl -X POST https://your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique_key_123" \
  -d '{
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+15555551234",
    "source": "referral",
    "tags": ["vip"]
  }'
```

**PATCH /api/contacts/:id**
```bash
curl -X PATCH https://your-domain.com/api/contacts/uuid-here \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["hot_lead", "follow_up"]}'
```

### **Deals API**

**GET /api/deals**  
**POST /api/deals**  
**PATCH /api/deals/:id**  
**DELETE /api/deals/:id**

### **Tasks API**

**GET /api/tasks**  
**POST /api/tasks**  
**PATCH /api/tasks/:id**  
**DELETE /api/tasks/:id**

### **Forms API**

**GET /api/forms**  
**POST /api/forms/:id/submit** - Submit a form programmatically

### **Marketing API**

**GET /api/marketing/campaigns**  
**POST /api/marketing/campaigns**  
**GET /api/marketing/campaigns/:id/stats**

---

## ⚡ **RATE LIMITS**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/contacts` | 100 req/min | Per API key |
| `/api/deals` | 100 req/min | Per API key |
| `/api/tasks` | 100 req/min | Per API key |
| `/api/forms/*/submit` | 10 req/min | Per IP |
| `/api/integrations/custom/webhook` | 60 req/min | Per API key |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-01-16T10:31:00Z
```

**Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded",
  "limit": 100,
  "remaining": 0,
  "reset_at": "2025-01-16T10:31:00Z",
  "retry_after": 45
}
```

---

## 🔄 **IDEMPOTENCY**

Prevent duplicate operations by including `X-Idempotency-Key` header:

```bash
curl -X POST https://your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Idempotency-Key: unique_request_id_123" \
  -d '{"full_name": "John Doe", "email": "john@example.com"}'
```

**How it works:**
1. First request with key → Creates contact
2. Retry with same key → Returns cached result (no duplicate)
3. Different key → Creates new contact

**Key Requirements:**
- Unique per request
- Can be any string (UUID recommended)
- Valid for 24 hours
- Max length: 255 characters

---

## 🛠️ **ERROR HANDLING**

### **Error Response Format**

```json
{
  "error": "Validation failed",
  "error_code": "validation_error",
  "message": "Email address is required",
  "field": "email",
  "correlation_id": "uuid",
  "documentation_url": "https://docs.your-crm.com/errors/validation_error"
}
```

### **HTTP Status Codes**

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | None |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request payload |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (use idempotency key) |
| 422 | Validation Error | Fix validation errors |
| 429 | Rate Limit Exceeded | Wait and retry |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | CRM is down, retry later |

### **Retryable Errors**

**DO retry:**
- 408 (Request Timeout)
- 429 (Rate Limit - respect Retry-After header)
- 500, 502, 503, 504 (Server errors)
- Network errors (ECONNRESET, ETIMEDOUT)

**DON'T retry:**
- 400, 401, 403, 404 (Client errors)
- 422 (Validation error - fix payload first)

---

## 📊 **PAGINATION**

All list endpoints support pagination:

```bash
GET /api/contacts?limit=50&offset=100&sort=created_at&order=desc
```

**Query Parameters:**
- `limit` - Items per page (default: 50, max: 100)
- `offset` - Number of items to skip
- `sort` - Field to sort by (default: created_at)
- `order` - Sort direction: asc or desc (default: desc)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 100,
    "has_more": true,
    "next_offset": 150
  }
}
```

---

## 🔔 **WEBHOOK TESTING**

Test your webhook endpoint:

```bash
curl -X POST https://yourapp.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-CRM-Signature: sha256=test_signature" \
  -d '{
    "event_id": "test-uuid",
    "event_type": "contact.created",
    "timestamp": "2025-01-16T10:30:00Z",
    "data": {
      "id": "contact-uuid",
      "full_name": "Test Contact",
      "email": "test@example.com"
    }
  }'
```

---

## 📝 **CODE EXAMPLES**

### **JavaScript/TypeScript**

```typescript
const CRM_API_KEY = 'your_api_key_here'
const CRM_BASE_URL = 'https://your-domain.com/api'

// Create contact
async function createContact(contactData: any) {
  const response = await fetch(`${CRM_BASE_URL}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRM_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(contactData),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }
  
  return await response.json()
}

// Usage
const contact = await createContact({
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+15555555555',
  source: 'api_integration',
})

console.log('Contact created:', contact.contact_id)
```

### **Python**

```python
import requests

CRM_API_KEY = 'your_api_key_here'
CRM_BASE_URL = 'https://your-domain.com/api'

# Create contact
def create_contact(contact_data):
    response = requests.post(
        f'{CRM_BASE_URL}/contacts',
        headers={
            'Authorization': f'Bearer {CRM_API_KEY}',
            'Content-Type': 'application/json',
            'X-Idempotency-Key': str(uuid.uuid4()),
        },
        json=contact_data
    )
    
    response.raise_for_status()
    return response.json()

# Usage
contact = create_contact({
    'full_name': 'John Doe',
    'email': 'john@example.com',
    'phone': '+15555555555',
    'source': 'api_integration',
})

print('Contact created:', contact['contact_id'])
```

### **cURL**

```bash
# Create contact
curl -X POST https://your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+15555555555",
    "source": "api_integration"
  }'

# Get contact by ID
curl -X GET https://your-domain.com/api/contacts/uuid-here \
  -H "Authorization: Bearer YOUR_API_KEY"

# List contacts with filter
curl -X GET "https://your-domain.com/api/contacts?source=api_integration&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🔒 **SECURITY BEST PRACTICES**

### **1. Store API Keys Securely**
- ❌ Don't commit to Git
- ❌ Don't expose in client-side code
- ✅ Use environment variables
- ✅ Rotate keys every 90 days

### **2. Use HTTPS Only**
- All API calls must use `https://`
- Requests to `http://` will be rejected

### **3. Verify Webhook Signatures**
```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

### **4. Implement Idempotency**
Always include `X-Idempotency-Key` for write operations

### **5. Handle Rate Limits**
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)
    
    if (response.ok) {
      return response.json()
    }
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      await sleep(parseInt(retryAfter) * 1000)
      continue
    }
    
    throw new Error(response.statusText)
  }
}
```

---

## 📚 **ADDITIONAL RESOURCES**

- **Full API Reference:** https://docs.your-crm.com/api
- **Authentication Guide:** https://docs.your-crm.com/auth
- **Webhook Guide:** https://docs.your-crm.com/webhooks
- **Code Examples:** https://github.com/your-org/crm-api-examples
- **Postman Collection:** [Download](https://docs.your-crm.com/postman)

---

## 🆘 **SUPPORT**

**Questions?**
- Email: api@your-crm.com
- Slack: #api-support
- Status: https://status.your-crm.com

**Report Issues:**
- GitHub: https://github.com/your-org/crm-api/issues
- Include: correlation_id from error response

---

**Happy Building!** 🚀

