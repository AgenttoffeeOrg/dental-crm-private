# Operational gotchas

Things that have bitten us in production. Read before debugging anything weird.

## 'use client' modules can't be imported by server routes

**Symptom:** code works in dev and jest tests, throws `TypeError: (0 , X.Y) is not a function` in production.

**Cause:** A file with `'use client'` at the top exports a function. A server-side API route imports that function. At runtime in a real Next.js production build, the import returns a placeholder object (a "client reference"), not the actual function. Test mocks bypass this entirely.

**Fix:** Either (a) remove the `'use client'` directive and gate any browser-only logic with `typeof window !== 'undefined'`, or (b) split shared utilities into separate `*.client.ts` and `*.server.ts` files.

**First seen:** Phase 2b.3, in `src/lib/marketing/feature-flags.ts`. Workaround at the time was to inline the `tenants.marketing_enabled` SELECT in the route. See `docs/2b/2b-3-changes.md` §5.5.

## Auto-deploy hook lives at `.husky/pre-push`, not `.git/hooks/`

**Symptom:** push completes but no Vercel deploy fires.

**Cause:** Husky redirects `core.hooksPath` to `.husky/_/`. Hooks placed in `.git/hooks/` are silently ignored.

**Fix:** Edit `.husky/pre-push`. Manual fallback: `npm run deploy:prod`.

**First seen:** Phase 2b.3 deploy hook diagnosis.

## Twilio inbound webhook signature URL must match what's configured in the Console

**Symptom:** signature verification fails for every inbound message; webhook returns 401.

**Cause:** Twilio computes the signature over the EXACT URL configured in the Console (including any query string, including the protocol). If the route handler computes the signature over `req.url` (the internal Next.js URL) instead of the public Vercel URL, the two won't match.

**Fix:** The signature helper must use the public URL. See `src/lib/whatsapp/twilio-signature.ts` and how it's invoked from `src/app/api/webhooks/whatsapp/route.ts` and `src/app/api/webhooks/sms/route.ts`. In production behind Vercel, `request.url` carries the public host because Vercel sets `x-forwarded-host` correctly; in local dev with Twilio webhook tunnels the URL Twilio used must equal what the helper sees.

**First seen:** Phase 2b.2.a (WhatsApp inbound rebuild).

## Twilio inbound: `sms_inbound` and `whatsapp_inbound` keyspaces are independent

**Symptom:** confused why the same `MessageSid` shape (`SMxxxx…`) appears under two `source_channel` values.

**Cause:** Twilio uses the same SID prefix (`SM…` for messaging) across SMS and WhatsApp. The `idx_attribution_touchpoints_external_msg_uniq` partial unique index is keyed on `(tenant_id, source_channel, external_message_id)` precisely so a hypothetical SID collision between channels would not cross-deduplicate.

**Fix:** Always filter by `source_channel = 'sms_inbound'` (or `'whatsapp_inbound'`) when looking up an `attribution_touchpoints` row by `external_message_id`. Don't filter by `external_message_id` alone.

**First seen:** Phase 2b.4 (SMS inbound rebuild, mirroring WhatsApp's pattern).

## Each tenant needs its own Twilio receiving number

**Symptom:** an inbound message from a known patient doesn't show up under their tenant in the CRM, or shows up under a different tenant.

**Cause:** Tenant resolution for inbound Twilio webhooks looks up the **receiving** number (`To`) against either `tenants.whatsapp_phone_number` or `tenants.sms_phone_number`. Whichever tenant claims that number gets the lead. If two tenants share a number (e.g. the WhatsApp shared sandbox `+14155238886` during testing, or `+447782218044` during initial SMS testing), only the OLDEST-by-`created_at` tenant will receive the message; the others see nothing.

**Fix:** In production, every practice gets its own Twilio number. Until that's automated by the wizard, set numbers via SQL (see `docs/onboarding/practice-onboarding-runbook.md` §SMS / §WhatsApp). The inbound helpers emit a `console.warn('[…-inbound] multi-tenant collision …')` log line when they detect the situation, so it's at least visible in Vercel function logs.

**First seen:** Phase 2b.4 (SMS), inherited pattern from 2b.2.a (WhatsApp).
