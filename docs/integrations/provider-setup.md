# Provider Setup Checklist

This checklist captures every credential we need to enable live communications inside the CRM. Keep this document updated as you provision keys.

> ⚠️ **Never paste live secrets into the codebase or share them in chat.**  
> Use the secure storage flow described below (`integration_store_credentials` via the service backend).

## 1. Twilio Account (Voice/SMS/WhatsApp)

| Setting                                                 | Description                                | Notes                                      |
| ------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `TWILIO_ACCOUNT_SID`                                    | Primary account identifier                 | Available in Twilio Console                |
| `TWILIO_AUTH_TOKEN`                                     | Secret token for REST API                  | Store encrypted via backend helper         |
| `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER` | Default sender for SMS                     | Messaging Service preferred                |
| `TWILIO_WHATSAPP_SENDER`                                | `whatsapp:+1234567890` format              | Must be WhatsApp-approved                  |
| `TWILIO_VOICE_CALLER_ID`                                | Caller ID used for outbound calls          | Needs voice capabilities                   |
| Voice Webhook URL                                       | `/api/webhooks/voice/stream` once deployed | Configure in Twilio Console                |
| SMS Webhook URL                                         | `/api/webhooks/sms`                        | Already hardened; confirm signature secret |
| WhatsApp Webhook URL                                    | `/api/webhooks/whatsapp`                   | Confirm sandbox vs production              |

## 2. SendGrid (Email Provider)

| Setting                  | Description                    | Notes                         |
| ------------------------ | ------------------------------ | ----------------------------- |
| `SENDGRID_API_KEY`       | API key with Mail Send scope   | Store encrypted               |
| Default from email       | e.g. `no-reply@yourdomain.com` | Domain must be verified       |
| Default reply-to         | Optional                       |                               |
| Event webhook (optional) | `/api/webhooks/email` (future) | For bounce/complaint insights |

## 3. Optional Email Providers

Only required if tenants opt into alternatives.

- **Gmail / Outlook**: OAuth client ID & secret, refresh token (if using direct SMTP/IMAP).
- **Amazon SES**: Access key ID and secret key, region.

## 4. Channel Toggles (per tenant)

Use `integration_channel_settings` to specify which channels are active:

- `twilio_voice_enabled`
- `twilio_sms_enabled`
- `twilio_whatsapp_enabled`
- `email_provider`
- `default_from_email`, `default_reply_to_email`
- `metadata` for channel-specific options (JSON)

## 5. Secure Storage Workflow

1. Backend (service role) collects plaintext secrets from a secure form or CLI.
2. Backend calls `integration_store_credentials(tenant_id, plaintext_json, encryption_key, updated_by)`.
   - `plaintext_json` structure suggestion:
     ```json
     {
       "twilio": {
         "accountSid": "...",
         "authToken": "...",
         "messagingServiceSid": "...",
         "whatsappSender": "...",
         "voiceCallerId": "...",
         "webhookSecret": "..."
       },
       "sendgrid": {
         "apiKey": "...",
         "defaultFrom": "no-reply@example.com",
         "defaultReplyTo": "support@example.com"
       }
     }
     ```
3. Encryption key is supplied by the backend from an environment variable (e.g. `INTEGRATION_CREDENTIAL_KEY`).
4. Retrieve credentials via `integration_load_credentials(tenant_id, encryption_key)` (service role only).

## 6. Environment Variables

Add the following placeholders to `.env.local` / deployment environment:

```
INTEGRATION_CREDENTIAL_KEY=REPLACE_ME_WITH_STRONG_PASSPHRASE
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_WHATSAPP_SENDER=
TWILIO_VOICE_CALLER_ID=
SENDGRID_API_KEY=
DEFAULT_FROM_EMAIL=
DEFAULT_REPLY_TO_EMAIL=
```

> For local development we use environment variables to feed the backend until the secure storage helper is wired in Phase 3.

## 7. Deployment Notes

- Ensure Supabase migrations (up to `20251110_integration_config.sql`) are applied before storing any secrets.
- The backend must run with the service role key to call `integration_store_credentials` and `integration_load_credentials`.
- Double-check Twilio webhook URLs after deployment (they change per environment).

---

Once these items are in place we can move into Phase 3 and wire the live credentials into the communication services and queues.
