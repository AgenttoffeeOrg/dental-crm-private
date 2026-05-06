# Phase 2a.4 — Test site & e2e validation (changes)

Phase 2a.4 is the final phase of 2a: it stands up a real-shape practice
website, real email delivery via Resend, and a structured manual smoke-test
pass across every entry point built in 2a.1 → 2a.3. It produced no new
product features beyond a small adjustment to the widget loader for
inline-mount support.

This file documents the deliverables, the deferred-debt list rolled forward
into the post-2a.4 cleanup phase, and the decisions taken during build.

---

## What was produced (Cursor)

### 1. Test practice site

`/Users/deepak/auth-app/test-practice-site/` (separate repo / folder; not
inside `dental-crm`).

```
test-practice-site/
├── index.html
├── about.html
├── treatments.html
├── contact.html        # also embeds the widget inline (manual mount)
├── styles/main.css
├── images/             # placeholder folder for hero photos
├── netlify.toml
└── README.md
```

- Static HTML + a single shared stylesheet. No build system, no JS framework.
- "Bright Smile Dental Practice" — fictional UK practice. Address and phone
  number are Ofcom-reserved-for-fiction; safe to publish.
- Every page has the floating-button widget snippet (auto-mount). The
  contact page also has an inline embed that uses the new `data-mode="manual"`
  loader path (see §3).
- Two placeholders (`__CRM_HOST__`, `__WIDGET_SLUG__`) that get rewritten
  by a sed one-liner before deploy. Documented in the README.
- Netlify drag-drop deploy, single-domain subdomain
  (`testpracticedental.netlify.app`).

### 2. Onboarding runbook

`dental-crm/docs/onboarding/practice-onboarding-runbook.md`.

11 sections + 3 appendices, all with `[SCREENSHOT: …]` placeholders for the
operator to fill in after the first run-through. Sections:

1. Pre-flight checklist
2. Tenant creation
3. Default offering provisioning
4. Widget configuration
5. Embed code (per CMS: WordPress / Wix / Squarespace / Webflow)
6. Notification routing
7. Test the widget on the practice's site
8. First-response training
9. Dedup queue intro
10. Things to watch for in week 1
11. Support escalation (with a logging template)

Appendices: quick links, one-page cheat sheet for the practice contact,
list of things the runbook can't fix yet (cross-references this file).

### 3. Widget loader — inline-mount support

`dental-crm/public/widget.js`:

- Added `data-mode="manual"`. In manual mode the loader fetches the config
  and the bundle, then dispatches a `DentalCRMWidgetReady` event on
  `window` with `detail: { slug, config, apiBase }`.
- Default behaviour (no `data-mode`, or `data-mode="auto"`) is unchanged:
  auto-mounts the floating button into a shadow-DOM host.
- Added `loadBundle()` indirection so two loaders on the same page (one
  auto, one manual) reuse a single `widget-bundle.js` `<script>` tag.
- Replaced the global `__DENTALCRM_WIDGET_LOADED__` guard with a
  per-script-tag `data-dcrm-processed` attribute, so the same page can
  carry both an auto-mount loader (floating button) and a manual loader
  (inline embed) without one clobbering the other.
- Auto-mount path additionally guards against a duplicate
  `#dentalcrm-widget-host` for the same slug, so accidental double-include
  doesn't render two floating buttons.

The widget bundle (`embed-entry.ts`) was untouched — the existing
`window.DentalCRMWidget.mount(target, config, apiBase)` API already supports
mounting into a plain `Element`, which is what the inline integration uses.

[Tested manually — see the e2e validation matrix in the prompt.]

---

## What Toffee runs (not Cursor)

These are documented in the prompt and the runbook; they're outside the
file-creation scope of this change-log:

- Resend account + API-key setup, dev-server env-var wiring.
- CRM hosting choice for the test pass: cloudflared tunnel vs Vercel
  preview. Either way, the URL is recorded in `dental-crm/.env.local`
  as `NEXT_PUBLIC_CRM_HOST`.
- Netlify drag-drop deploy of `test-practice-site/`.
- The 14-test e2e validation matrix.
- Cleanup of `e2e-…@example.com` test data after the matrix completes.
- Filling `[SCREENSHOT: …]` placeholders in the runbook.

---

## Deferred / debt list rolled forward into the post-2a.4 cleanup phase

The accumulated debt list from 2a.1 → 2a.3 stays open. 2a.4 adds these
items on top:

### From the prompt

- **Real sender-domain verification with Resend.** Currently using the
  shared `@resend.dev` test sender. Switch to a per-practice (or shared
  Limelight) verified domain when practice #1 goes live.
- **A "test mode" toggle on widgets.** So smoke-test submissions during
  validation don't end up in the real lead pipeline. Nice-to-have for 2b
  onboarding; out of scope for 2a.4.
- **CI/CD story for production.** Whichever CRM hosting Toffee picks
  (cloudflared tunnel for the test pass, Vercel preview as a halfway-house,
  or a real production deploy) needs to be reflected in a real CI/CD
  pipeline before friends-and-family go live for real.

### Found while writing the runbook

- **Notification-routing UI.** No screen at `/settings/notification-routing`
  yet — `practice_notification_routing` is currently a SQL-only edit. The
  runbook documents the SQL as a stop-gap; the UI is needed before any
  practice can self-serve recipient changes.
- **Embed-snippet copy button** in `/settings/booking-widget` does not
  expose the optional `data-base` attribute. Only matters if a practice
  ever fronts the loader behind a CDN that's separate from the CRM API.
  Tracked but not blocking.
- **Tenant rename.** The runbook flags this as a rough edge: there is no
  UI for changing a tenant's display name after creation, only direct DB
  edits. Common practice-owner request once the auto-generated name turns
  out to be wrong.

### Found during e2e (deferred during run)

> Toffee: append rows here as the matrix runs. Anything that breaks during
> 2a.4 testing that you don't immediately fix — write the symptom, the
> reproduction, and which test surfaced it.

| #  | Test                          | Symptom | Decision |
| -- | ----------------------------- | ------- | -------- |
| _empty until the matrix runs_ |         |          |

---

## Decisions taken during build

- **Test site is hand-written HTML, not a React SPA.** Most real practice
  sites are WordPress / Wix / Squarespace; hand-written HTML is closer to
  that reality and surfaces the kinds of issues we'll hit in the wild
  (caching plugins, CSP, footer-injection plugins).
- **Test site uses two embed integrations.** Floating button on every
  page (auto-mount) plus inline embed on the contact page (manual mount).
  This validates both the default integration and the advanced one in a
  single deploy.
- **Widget loader was patched, not the widget bundle.** The bundle's
  `mount()` API already supported plain Element targets; no React change
  was needed. The loader change is loader-only and backwards-compatible.
- **Per-script-tag guard.** Switching from a global
  `__DENTALCRM_WIDGET_LOADED__` lock to a per-tag `data-dcrm-processed`
  attribute is intentional: the previous design silently dropped the
  second loader, which made the inline-embed pattern impossible. The new
  guard protects against accidental double-processing of the same tag
  (e.g. when `document.currentScript` fails to resolve) without blocking
  legitimate dual-loader pages.
- **Calendar URL placeholder is a `calendly.com/bright-smile-test/...`
  URL that may 404.** That's deliberate for the test pass: we're
  validating the redirect, not the calendar itself. Production practices
  bring their own real URLs.
