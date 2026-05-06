# Phase 2a.4 — Pre-flight smoke test

Use this runbook to confirm Vercel + Netlify + Resend are all wired up correctly
before running the full 14-test validation matrix.

## URLs

- **CRM (Vercel preview):** https://dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app
- **Test practice site (Netlify):** https://dental-test-practice-2026.netlify.app
- **Landing page (CRM-hosted):** https://dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app/w/deepaks-dental-practice-1130
- **Widget slug:** `deepaks-dental-practice-1130`

## Step 1 — Confirm widget config returns

Open in a browser:
https://dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app/api/widget/config?slug=deepaks-dental-practice-1130

Expected: a JSON response showing `practice_name`, a `treatments` array
with multiple entries, and a `paths_enabled` array.

Already verified during deploy: `practice_name = "deepaks-dental-practice"`,
20 treatments, `paths_enabled = ["webform"]`.

## Step 2 — Confirm CRM-hosted landing page renders

Open: https://dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app/w/deepaks-dental-practice-1130

Expected: a page renders showing the practice name and the inline widget.

## Step 3 — Confirm test practice site renders with widget

Open: https://dental-test-practice-2026.netlify.app/

Expected: the practice site loads, looks like a real dental practice, and a
floating "Book a consultation" button appears bottom-right. Click it — the
modal opens with the practice's greeting.

## Step 4 — Submit one real lead from the test site

On https://dental-test-practice-2026.netlify.app/contact.html (or any page):

1. Click the floating Book button (or use the inline widget on contact.html)
2. Pick any treatment (e.g. General Checkup)
3. Click "Webform"
4. Fill in:
   - Name: Smoke Test
   - Email: <YOUR_REAL_EMAIL>
   - Phone: +447700900001
5. Submit

Watch for the success message in the widget.

## Step 5 — Confirm the email arrives

Within 30-60 seconds, check the inbox of <YOUR_REAL_EMAIL>:

- Subject: "New lead: Smoke Test"
- Body mentions "General Checkup" and "respond within X minutes"
- "View Lead" button links to a CRM contact page

If the email lands in spam, mark as Not Spam and add `onboarding@resend.dev`
to the safe-sender list.

## Step 6 — Confirm DB state via Supabase MCP

```sql
SELECT primary_email, full_name, created_at FROM contacts
WHERE full_name = 'Smoke Test'
ORDER BY created_at DESC LIMIT 1;
-- expected: 1 row

SELECT count(*) FROM notifications
WHERE event_key = 'lead.arrived'
  AND entity_id = (SELECT id::text FROM contacts WHERE full_name = 'Smoke Test' ORDER BY created_at DESC LIMIT 1);
-- expected: 1
```

## Cleanup after smoke test

```sql
DELETE FROM activities WHERE contact_id IN (SELECT id FROM contacts WHERE full_name = 'Smoke Test');
DELETE FROM attribution_touchpoints WHERE contact_id IN (SELECT id FROM contacts WHERE full_name = 'Smoke Test');
DELETE FROM notifications WHERE entity_type = 'contact' AND entity_id IN (SELECT id::text FROM contacts WHERE full_name = 'Smoke Test');
DELETE FROM contacts WHERE full_name = 'Smoke Test';
```

## What to do if any step fails

- **Step 1 fails (config not returned):** check Vercel function logs.
  Likely missing env var. Inspect via the Vercel dashboard or
  `vercel logs https://dental-d1xvxu6cu-toffeehegde-9056s-projects.vercel.app`.
- **Step 2 fails (landing page broken):** check Vercel function logs.
- **Step 3 fails (widget doesn't appear on test site):** open browser
  devtools console, look for CORS errors or 404s loading widget.js / widget-bundle.js.
  CORS was confirmed during deploy: `Access-Control-Allow-Origin: *`.
- **Step 4 fails (form won't submit):** open browser devtools network tab, find the
  POST to `/api/widget/sessions/.../submit`, check the response body for error details.
- **Step 5 fails (no email arrives):** check the Resend dashboard
  (resend.com) → Emails. If "delivered" but not in inbox, check spam.
  If "bounced", the sender domain isn't accepting from `onboarding@resend.dev`
  for some reason — try a different inbox. If nothing in Resend at all, check
  `notification_delivery_log` table for errors.

When all 6 steps pass, you're ready to run the full 14-test validation
matrix from Phase 2a.4 Checkpoint 4.

## Deviations from the original deployment helper plan

For full transparency, the deploy that produced these URLs differed from the
plan in `phase_2a_4_deployment_helper.md` in three ways. None affect the
smoke test, but you should know about them:

1. **Cron schedule changed from hourly to daily.** `vercel.json` originally
   declared `"schedule": "0 * * * *"` (hourly). Vercel Hobby plans cap cron at
   once per day, so the deploy was rejected. The schedule was changed to
   `"0 2 * * *"` (daily at 02:00 UTC) to unblock the deploy. To restore hourly
   you must either upgrade to Vercel Pro or move scheduled-audits to Railway
   cron. The cron handler at `src/app/api/cron/scheduled-audits/route.ts` is
   unchanged.

2. **Vercel Deployment Protection (SSO) was disabled on the project.** It is
   on by default for new projects on personal/Hobby accounts. Without
   disabling it, every endpoint — including `/api/widget/config` — returned
   401 to the Netlify origin. `ssoProtection` is now `null`. Re-enable it
   before adding any real users.

3. **Env vars were synced via Vercel REST API, not via the CLI.** Vercel CLI
   53.1.0 has a regression where `vercel env add NAME preview --value V --yes`
   loops back into the same `git_branch_required` prompt it suggests as the
   non-interactive form. Bypassed using `POST /v10/projects/{id}/env?upsert=true`.
   No env-var values were exposed in chat or in any markdown.

4. **`SENDGRID_API_KEY`, `DEFAULT_FROM_EMAIL`, `DEFAULT_REPLY_TO_EMAIL`, `BASE_URL`,
   `NEXT_PUBLIC_APP_URL`, `APP_URL`, `NODE_ENV`, `NEXT_PUBLIC_SENTRY_DEBUG`,
   `SENTRY_DEBUG`** were intentionally NOT synced (per the runbook).
