# Phase 2b.1.b — deferred follow-ups

Setup tasks that we deliberately skipped or accepted-as-shortcuts during the Phase 2b.1.b.1 prerequisites walkthrough on **2026-05-05**, that need addressing **before going live with real practices** in 2b.1.b.2 or shortly after.

Owner: `eeveeshegde@gmail.com` (current Cloud project + Ads MCC owner). Most items below cannot be actioned by Cursor and require a human in the Google Cloud / Google Ads / Vercel UIs.

---

## Blockers for OAuth Verification (must be done before publishing the OAuth app out of Testing mode → required for >100 connected practices)

### F-1. Get a custom domain
- **Why**: Google rejects `*.vercel.app` as an OAuth "Authorized domain" because `vercel.app` is on the [Public Suffix List](https://publicsuffix.org/). Without a verified-ownership custom domain, the OAuth app cannot pass App Verification.
- **Action**: register a domain (e.g. `toffeecrm.co.uk`, `dentalcrm.toffee.io`), point it at the Vercel project, and verify ownership in Google Search Console using the same Google account that owns the OAuth app.
- **When**: before submitting for OAuth Verification in 2b.1.b.2.

### F-2. Host privacy policy + terms of service pages on the custom domain
- **Why**: Google Verification reviewers require live URLs that explain what data the app collects, why, and how it's processed.
- **Action**: write `/privacy` and `/terms` pages, host them at `https://<custom-domain>/privacy` and `/terms`, then add those URLs to the Auth Platform → Branding tab in the Cloud Console.
- **When**: alongside F-1.

### F-3. Submit the OAuth app for Verification
- **Why**: Testing mode is capped at 100 test users. Beyond that we need a verified app.
- **Action**: in the Cloud Console (`https://console.cloud.google.com/auth/audience?project=dental-crm-016548`) → "Publish app" → submit for Verification with the materials from F-1 and F-2. Google takes ~4–6 weeks for sensitive-scope verification (the `adwords` scope counts as sensitive). Some applications need a YouTube demo video showing the consent flow.
- **When**: as soon as F-1 and F-2 are done, because it's the long-pole item.

---

## Blockers for Basic Access developer token approval

### F-4. Re-apply for Basic Access if rejected
- **Why**: Google's reviewers sometimes reject Basic Access applications that point to a `*.vercel.app` URL because they want to see a real production domain with hosted privacy/terms.
- **Action**: if the application submitted on 2026-05-05 from the production MCC (`Dental CRM Master`, `743-721-8131`) is rejected, re-apply after F-1 + F-2 are done, citing the new custom domain and live policy pages in the application form.
- **When**: only triggered if rejection email arrives. Test Access continues to work for dev in the meantime.

### F-5. Replace the Test Access token with the Basic Access token in `.env.local`
- **Why**: The current `GOOGLE_ADS_DEVELOPER_TOKEN` value is a Test Access token that only works against test accounts. Once Basic Access is approved Google issues a new token that works against real practice accounts too.
- **Action**: in the API Centre on `Dental CRM Master`, copy the new token and replace the value in `dental-crm/.env.local`. No code change needed.
- **When**: when the Basic Access approval email arrives (1–3 business days from 2026-05-05).

---

## Identity & ownership hygiene

### F-6. Migrate Cloud project + Ads MCC ownership off personal Gmail
- **Why**: `eeveeshegde@gmail.com` currently owns: the Cloud project `dental-crm-016548`, the production MCC `Dental CRM Master` (743-721-8131), the Test MCC `Dental CRM Test Master` (937-470-8799), the OAuth app, and the developer token. If access to that Gmail is ever lost (compromise, lost 2FA, account suspension, leaving the company), the entire Google Ads integration is locked. Recovery is brutal.
- **Action**: 
  1. Create a Google Workspace account `toffee@<custom-domain>` (or similar role-account, not tied to an individual).
  2. Add it as **Owner** to the Cloud project (Console → IAM → Grant access → role: Owner).
  3. Add it as **Manager-level admin** to both MCCs (Ads → Admin → Access and security → +).
  4. Once verified working, demote `eeveeshegde@gmail.com` from Owner / Admin (don't delete the access entirely — keep as a backup Editor / Standard for now).
- **When**: ideally before going live with real practices. Definitely before any organisational change (new staff, business sale, etc.).

### F-7. Rotate the OAuth Client Secret — ✅ done 2026-05-06
- **Why**: the original secret was pasted into a Cursor chat session on 2026-05-05 during the walkthrough. Cursor chat history may persist longer than is appropriate for a credential.
- **Status**: rotated on 2026-05-06 morning. New secret is in `dental-crm/.env.local`. Old secret is invalidated by Google (cannot be reused).
- **Outstanding sub-task**: when the integration is deployed to Vercel, also set `GOOGLE_OAUTH_CLIENT_SECRET` in the Vercel project's Production / Preview / Development environment variables to the same new value. (No action needed yet — nothing is using this secret in any deployed environment as of writing.)

---

## Vercel deployment hygiene

### F-8. Confirm `dental-crm-nine.vercel.app` is the stable production alias
- **Why**: Vercel gives you both stable production aliases and per-deployment preview URLs. If `dental-crm-nine.vercel.app` is the preview URL (changes on every push), the OAuth redirect URI registered in Step 4 of the runbook will silently break on the next deploy.
- **Action**: Vercel project → Settings → Domains. Confirm `dental-crm-nine.vercel.app` is listed under "Production Domains" / has a "Production" badge, not "Preview".
- **When**: now (cheap to check; expensive bug if wrong).

---

## Cleanup

### F-9. Decide what to do with the orphaned production sub-account `391-109-8146`
- **Why**: created accidentally on 2026-05-05 when the Google Ads UI auto-instantiated a sub-account under the production MCC during the (failed) attempt to create a test sub-account there. It has no billing attached, no campaigns, can't spend money. But it's clutter.
- **Action**: Either:
  - (a) Repurpose it as the first-real-practice sub-account during onboarding (rename it appropriately), or
  - (b) Cancel/delete it: production MCC → Accounts → Sub-account settings → click into `391-109-81…` → Account settings → Cancel account.
- **When**: before onboarding the first real practice (otherwise it's in the way / confusing).

### F-10. Decide what to do with the orphan test sub-account `527-015-5829`
- **Why**: a second test sub-account was auto-created under `Dental CRM Test Master` during a click-through on 2026-05-05. Doesn't break anything (it's a test account, no billing possible) but clutter.
- **Action**: optional — either ignore it (test MCCs auto-delete after 12 months of inactivity per Google docs) or delete it manually via Test MCC → Accounts → Sub-account settings → click in → Cancel account.
- **When**: any time. Low priority.

### F-11. Optionally rename the conversion action from `offline (upload)` to `Lead (test)` for clarity
- **Why**: Google's new Conversions wizard auto-named the conversion action `offline (upload)` rather than the `Lead (test)` name from the original runbook plan. Functionally identical; just less self-documenting.
- **Action**: in Test sub-account `167-526-8286` → Goals → Conversions → click `offline (upload)` → Edit Settings → rename to `Lead (test)`.
- **When**: any time. Doesn't affect the integration which references it by numeric ID `7600535419`.

---

## Cross-references

- Setup runbook (now updated with the corrections discovered during this walkthrough): `Audit and Analysis/Build/2b/Phase 2b.1.b.1 prerequisites google-ads-setup-runbook.md`
- Env vars are in `dental-crm/.env.local` (gitignored, not tracked)
- Google Ads architectural reference: <https://developers.google.com/google-ads/api/docs/best-practices/test-accounts>
- OAuth App Verification: <https://support.google.com/cloud/answer/9110914>
- Public Suffix List (why `vercel.app` is rejected): <https://publicsuffix.org/>
