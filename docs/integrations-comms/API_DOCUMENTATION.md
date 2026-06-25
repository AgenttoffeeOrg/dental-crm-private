# API Documentation

## Overview
All API routes are authenticated and require valid session tokens.

## Base URL
```
https://yourapp.com/api
```

## Authentication
Include session cookie or Authorization header:
```
Authorization: Bearer YOUR_TOKEN
```

## Endpoints

### Contacts
**GET /api/contacts**
Get all contacts for tenant
```json
Response: [
  {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "primary_email": "john@example.com",
    "source": "website"
  }
]
```

**POST /api/contacts**
Create new contact
```json
Request: {
  "first_name": "Jane",
  "last_name": "Smith",
  "primary_email": "jane@example.com"
}
```

### Deals
**GET /api/deals**
Get all deals

**POST /api/deals**
Create new deal

**PATCH /api/deals/:id**
Update deal

### Tasks
**GET /api/tasks**
Get all tasks

**POST /api/tasks**
Create task

**PATCH /api/tasks/:id/complete**
Mark task as complete

### Marketing
**POST /api/marketing/campaigns**
Create campaign

**GET /api/marketing/campaigns/:id/analytics**
Get campaign analytics

### Webhooks
**POST /api/webhooks/form-submission**
Handle form submissions

**POST /api/webhooks/email**
Handle email webhooks

## Rate Limits
- 100 requests per minute per IP
- 1000 requests per hour per tenant

## Error Codes
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Server Error

## Webhooks
Configure webhook URLs in Settings → API & Developer


