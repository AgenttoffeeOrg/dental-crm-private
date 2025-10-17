# API Reference - Multi-Location & Billing

Complete API reference for multi-location, billing, and organization management endpoints.

---

## Table of Contents

1. [Organization Discovery](#organization-discovery)
2. [Join Requests](#join-requests)
3. [User Invitations](#user-invitations)
4. [Billing & Subscriptions](#billing--subscriptions)
5. [Location Access](#location-access)
6. [Location Switching](#location-switching)

---

## Organization Discovery

### POST /api/organizations/discover

Find organizations by email domain or website URL.

**Request:**
```json
{
  "email": "user@smithdental.com",
  "website": "https://smithdental.com"
}
```

**Response:**
```json
{
  "found": true,
  "matchType": "email",
  "normalizedDomain": "smithdental.com",
  "organizations": [
    {
      "id": "uuid",
      "name": "Smith Dental Practice",
      "website_url": "https://smithdental.com",
      "website_host": "smithdental.com",
      "verified_at": "2025-10-15T10:00:00Z",
      "match_confidence": "high"
    }
  ]
}
```

**Errors:**
- `400` - Missing email or website
- `403` - Feature not enabled
- `500` - Server error

---

## Join Requests

### POST /api/join-requests

Create a new join request.

**Request:**
```json
{
  "tenant_id": "uuid",
  "requester_email": "john@smithdental.com",
  "requester_name": "John Doe",
  "message": "I work at the front desk",
  "requested_role": "staff"
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "message": "Join request submitted successfully"
}
```

### GET /api/join-requests

List join requests for organization (Admin only).

**Query Parameters:**
- `status` - Filter by status (`pending`, `approved`, `rejected`)

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "requester_email": "john@smithdental.com",
      "requester_name": "John Doe",
      "message": "I work at the front desk",
      "requested_role": "staff",
      "status": "pending",
      "created_at": "2025-10-18T10:00:00Z"
    }
  ]
}
```

### POST /api/join-requests/:id/approve

Approve a join request.

**Request:**
```json
{
  "assigned_role": "staff"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Join request approved",
  "result": {
    "success": true,
    "message": "Request approved and user added",
    "user_id": "uuid"
  }
}
```

**Errors:**
- `400` - Seat limit reached (includes `requires_upgrade: true`)
- `404` - Request not found
- `500` - Server error

### POST /api/join-requests/:id/reject

Reject a join request.

**Request:**
```json
{
  "reason": "Email not recognized"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Join request rejected"
}
```

---

## User Invitations

### POST /api/users/invite

Invite a user to the organization (Enhanced with seat checks).

**Request:**
```json
{
  "email": "newuser@practice.com",
  "role": "staff",
  "tenant_id": "uuid",
  "invited_by": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "newuser@practice.com",
    "role": "staff",
    "status": "pending",
    "expires_at": "2025-10-25T10:00:00Z",
    "created_at": "2025-10-18T10:00:00Z"
  },
  "email_sent": true,
  "message": "Invitation created and sent successfully"
}
```

**Errors:**
- `400` - Validation error or seat limit reached
  ```json
  {
    "error": "Not enough seats available",
    "requires_upgrade": true,
    "seat_usage": {
      "active_seats": 5,
      "seat_limit": 5,
      "available_seats": 0
    }
  }
  ```

### GET /api/users/invite

List invitations for organization.

**Query Parameters:**
- `tenant_id` - Organization ID (required)

**Response:**
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "staff",
      "status": "pending",
      "invited_by": {
        "id": "uuid",
        "full_name": "Admin User"
      },
      "created_at": "2025-10-18T10:00:00Z",
      "expires_at": "2025-10-25T10:00:00Z"
    }
  ]
}
```

### DELETE /api/users/invite

Cancel a pending invitation.

**Query Parameters:**
- `id` - Invitation ID (required)

**Response:**
```json
{
  "success": true,
  "message": "Invitation cancelled successfully"
}
```

---

## Billing & Subscriptions

### GET /api/billing/subscription

Get current subscription details.

**Response:**
```json
{
  "subscription": {
    "id": "uuid",
    "tenant_id": "uuid",
    "plan": {
      "id": "uuid",
      "name": "professional_monthly",
      "display_name": "Professional",
      "tier": "tier2",
      "default_seat_limit": 10,
      "max_seat_limit": 15
    },
    "status": "active",
    "seat_limit": 10,
    "active_seats": 7,
    "available_seats": 3,
    "current_period_start": "2025-10-01T00:00:00Z",
    "current_period_end": "2025-11-01T00:00:00Z",
    "trial_end": null,
    "cancel_at_period_end": false
  },
  "seatUsage": {
    "total_seats": 10,
    "active_seats": 7,
    "available_seats": 3,
    "seat_limit": 10,
    "usage_percentage": 70,
    "is_at_limit": false,
    "can_add_seats": true,
    "max_additional_seats": 5
  }
}
```

### GET /api/billing/plans

List available subscription plans.

**Query Parameters:**
- `interval` - Filter by billing interval (`monthly` | `yearly`)

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "professional_monthly",
      "display_name": "Professional",
      "description": "For growing practices",
      "tier": "tier2",
      "default_seat_limit": 10,
      "max_seat_limit": 15,
      "price_amount": 9900,
      "price_currency": "GBP",
      "billing_interval": "monthly",
      "is_featured": true,
      "features": [
        "All Starter features",
        "Up to 15 users",
        "Advanced marketing"
      ],
      "entitlements": [
        {
          "key": "custom_roles",
          "limit_value": null,
          "description": "Create custom roles"
        }
      ]
    }
  ]
}
```

---

## Location Access

### GET /api/locations/access

Get location access for current user or specified user.

**Query Parameters:**
- `userId` - User ID (optional, admins only)

**Response:**
```json
{
  "access": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "tenant_id": "uuid",
      "location_name": "Downtown Location",
      "is_active": true,
      "granted_at": "2025-10-15T10:00:00Z",
      "granted_by": {
        "id": "uuid",
        "name": "admin@example.com"
      }
    }
  ]
}
```

### POST /api/locations/access

Grant user access to a location (Admin only).

**Request:**
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "notes": "Granted for cross-location support"
}
```

**Response:**
```json
{
  "success": true,
  "access_id": "uuid"
}
```

**Errors:**
- `403` - Multi-location feature not enabled
- `401` - Unauthorized
- `400` - Missing required fields

### DELETE /api/locations/access

Revoke user access to a location (Admin only).

**Request:**
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "reason": "No longer working at this location"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Location Switching

### GET /api/locations/accessible

Get all locations accessible to current user.

**Response:**
```json
{
  "locations": [
    {
      "id": "uuid",
      "name": "Smith Dental Practice",
      "locationName": "Downtown",
      "isPrimary": true
    },
    {
      "id": "uuid",
      "name": "Smith Dental Practice",
      "locationName": "Uptown",
      "isPrimary": false
    }
  ],
  "count": 2
}
```

### POST /api/locations/switch

Switch user's active location.

**Request:**
```json
{
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location switched successfully"
}
```

**Errors:**
- `400` - Missing tenant_id
- `403` - User doesn't have access to this location
- `401` - Unauthorized

---

## Authentication

All endpoints require authentication via session cookie or Bearer token.

### Headers
```
Cookie: sb-access-token=xxx; sb-refresh-token=xxx
// OR
Authorization: Bearer <access_token>
```

### Error Responses

All endpoints may return:

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "details": "Error message (development only)"
}
```

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute
- Invite endpoints: 20 requests/hour

Exceeding rate limits returns `429 Too Many Requests`.

---

## Webhooks

### Stripe Webhooks

`POST /api/webhooks/stripe`

Handles Stripe subscription events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Security:**
- Validates webhook signature
- Idempotent processing
- Automatic retry on failure

---

## Testing

### Development Mode

Set `NODE_ENV=development` to:
- Enable detailed error messages
- Expose invitation links in responses
- Bypass email sending (console log instead)
- Disable rate limiting

### Feature Flags

Control features via environment variables:
```bash
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false
ENABLE_SEAT_ENFORCEMENT=true
ENABLE_EMAIL_SENDING=false
```

---

## Support

For API support, contact: support@dentalcrm.com

For technical documentation: https://docs.dentalcrm.com

