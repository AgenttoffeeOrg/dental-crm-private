## Communications Provider Configuration

This guide covers the credentials required for the production-ready email, SMS, and WhatsApp integrations wired up in Phase 0.

### Email Providers

| Provider | Required Fields in `integration_settings` | Environment Variables | Notes |
| --- | --- | --- | --- |
| SendGrid | `email_provider = 'sendgrid'`, `email_api_key`, `email_from_address`, optional `email_from_name` | `EMAIL_FROM` (fallback only) | Uses the official `@sendgrid/mail` SDK. Returns SendGrid message id when available. |
| Gmail | `email_provider = 'gmail'`, `email_from_address`, `email_oauth_refresh_token`, optional `email_oauth_token`, `email_oauth_expires_at` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Access tokens refresh automatically when expired. Messages are sent via Gmail REST API (`googleapis`). |
| Outlook / Office 365 | `email_provider = 'outlook'`, `email_from_address`, `email_oauth_refresh_token`, optional `email_oauth_token`, `email_oauth_expires_at` | `MICROSOFT_CLIENT_ID` (or `AZURE_AD_CLIENT_ID`), `MICROSOFT_CLIENT_SECRET` (or `AZURE_AD_CLIENT_SECRET`), optional `MICROSOFT_TENANT_ID` | Uses Microsoft Graph `me/sendMail`. Tokens refresh automatically. |
| Amazon SES | `email_provider = 'ses'`, `email_from_address`, optional `email_from_name` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION` (defaults to `us-east-1`) | Uses AWS SDK v3 (`@aws-sdk/client-ses`). From address must be verified in SES. |

All providers log request/response metadata to `integration_logs` and stamp external IDs onto CRM activities.

### SMS (Twilio)

- `integration_settings.is_sms_configured = true`
- `sms_account_sid`, `sms_auth_token`, `sms_from_number`
- Outbound messages use the Twilio SDK. Responses include Twilio status codes and message SIDs.
- Inbound messages are handled via `/api/webhooks/sms` with signature verification, idempotency, audit logging, and DLQ support.

### WhatsApp (Twilio WhatsApp Business)

- `integration_settings.is_whatsapp_configured = true`
- `whatsapp_account_sid`, `whatsapp_auth_token`, `whatsapp_from_number` (format `whatsapp:+15551234567`)
- Outbound messages use the Twilio SDK and support optional media URLs.
- Inbound messages are handled via `/api/webhooks/whatsapp` with the same hardening as SMS.

### Error Handling & Logging

- All send endpoints short-circuit with `400` when credentials are missing or disabled in settings.
- Provider errors bubble up as `502` responses and are captured in `integration_logs`.
- Successful sends create CRM activities with `message_status` (`queued`, `sent`, etc.) and record external IDs.

### Token Refresh Behaviour

- Gmail and Outlook tokens refresh automatically when `email_oauth_expires_at` is nearing expiry. Updated tokens are persisted back into `integration_settings`.
- Ensure refresh tokens are captured during the OAuth consent flow when enabling a tenant.

### Deployment Checklist

1. Populate the relevant environment variables (see table above).
2. Store provider credentials per tenant in `integration_settings`.
3. Expose the webhook endpoints to Twilio (SMS/WhatsApp) and configure the matching URLs in the Twilio console.
4. Verify SES domains/email addresses before switching tenants to the SES provider.





