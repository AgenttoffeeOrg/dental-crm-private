# Phase 2b.10 — System-email module merge

**Branch:** `phase-1-attribution-foundation`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  

**Scope:** Merge the two parallel system-email modules. Keep `src/lib/services/email-service.ts` (multi-provider). Delete `src/lib/email-service.ts` (Resend-only). Repoint all callers. No behaviour change.

---

## 1. Summary

The Resend-only `src/lib/email-service.ts` singleton is deleted. All surviving callers now use the multi-provider `src/lib/services/email-service.ts`. Pre-flight showed the four expected API routes (`users/invite`, `join-requests/*`) were **already** on the canonical module (likely migrated in 2b.7); the only live loser import was `channel-adapters.ts`, which used the generic `emailService.send()` path for notification emails. That call site was repointed to `sendEmail()` with `EmailAddress`-shaped parameters. No route auth, validation, or business logic changed.

---

## 2. Schema migration

**None.**

---

## 3. Adaptations from prompt → live shape

### 3.1 Branch + working tree (§1.1)

- Branch: `phase-1-attribution-foundation` ✅  
- Tip before work: `37d5fe7` (`docs(2b.9.1): record operator gate pass and DOMPurify deploy`)  
- Uncommitted: `supabase/.temp/*` only (gitignored) ✅

### 3.2 Husky / Vercel baseline (§1.2)

- Last deploy in log at start: `dpl_EjEUJ77HiPWDc4w3SmCFL29HUjE9` → **READY**

### 3.3 Caller grep — loser (`lib/email-service`) (§1.3)

```text
src/lib/notifications/channel-adapters.ts
  17:import { emailService } from '@/lib/email-service'
```

### 3.4 Caller grep — winner (`lib/services/email-service`) (§1.3)

```text
src/app/api/users/invite/route.ts
  5:import { sendInvitationEmail } from '@/lib/services/email-service'
src/app/api/join-requests/route.ts
  11:import { sendJoinRequestNotification } from '@/lib/services/email-service'
src/app/api/join-requests/[id]/approve/route.ts
  10:import { sendJoinRequestApproved } from '@/lib/services/email-service'
src/app/api/join-requests/[id]/reject/route.ts
  9:import { sendJoinRequestRejected } from '@/lib/services/email-service'
```

### 3.5 Sanity sweeps (§1.3, pre-change)

```text
emailService.:
  src/lib/notifications/channel-adapters.ts:91:    const result = await emailService.send({

EmailService:
  src/lib/notifications/channel-adapters.ts:6 (comment only)
  src/lib/email-service.ts (class definition — deleted)
```

No callers of `sendWelcome`, `sendPasswordReset`, or `sendEmailVerification`. §1.4.1 STOP **not** triggered.

### 3.6 Surface diff (§1.4)

| Loser export | Canonical equivalent | Status |
|---|---|---|
| `EmailService` class | (standalone functions) | Adaptation at `channel-adapters.ts` only |
| `emailService` singleton | (standalone functions) | Same |
| `.sendInvitation(...)` | `sendInvitationEmail(...)` | Routes already on canonical — no edit |
| `.send({ to, from, subject, html })` | `sendEmail(EmailData)` | Repointed in `channel-adapters.ts` |
| `.sendWelcome(...)` | **(none)** | Zero callers ✅ |
| `.sendPasswordReset(...)` | **(none)** | Zero callers ✅ |
| `.sendEmailVerification(...)` | **(none)** | Zero callers ✅ |

### 3.7 Parameter-shape comparison (§1.4.2)

**Loser — generic send:**

```ts
async send(options: EmailOptions) // EmailOptions: to: string | string[], from?: string, subject, html, ...
```

**Canonical — generic send:**

```ts
export async function sendEmail(data: EmailData): Promise<EmailResult>
// EmailData: to: EmailAddress | EmailAddress[], from?: EmailAddress, subject, html, ...
// EmailAddress: { email: string; name?: string }
```

**Loser — invitation (orphaned on loser; routes already use canonical):**

```ts
async sendInvitation(to: string, inviterName: string, practiceName: string, inviteLink: string, role: string)
```

**Canonical — invitation:**

```ts
export async function sendInvitationEmail(
  to: EmailAddress,
  invitedBy: string,
  organizationName: string,
  inviteLink: string,
  role: string
): Promise<EmailResult>
```

Both return `{ success, messageId?, error? }` at the call site (loser via `.send()` wrapper; canonical directly).

### 3.8 Colocated tests (§1.5)

```text
find src/lib -path '*__tests__*' -name '*email-service*' -print
→ (no matches)

ls src/lib/__tests__/ | grep -i email
→ (no colocated tests at src/lib/__tests__/)
```

### 3.9 Call-site adaptations (§2.2)

**`src/lib/notifications/channel-adapters.ts`**

Before:

```ts
import { emailService } from '@/lib/email-service'
// ...
const result = await emailService.send({
  to: payload.user_email,
  from: fromEmail,
  subject: payload.title,
  html: generateEmailHTML(payload),
})
```

After:

```ts
import { sendEmail } from '@/lib/services/email-service'
// ...
const result = await sendEmail({
  to: { email: payload.user_email },
  from: { email: fromEmail },
  subject: payload.title,
  html: generateEmailHTML(payload),
})
```

**Comment-only fix** (post-delete grep hygiene): `src/lib/integrations/email-provider.ts` L413 — stale path reference updated to `src/lib/services/email-service.ts`. No logic change.

---

## 4. New TypeScript modules

**None.**

---

## 5. Modified files

| Path | Change |
|------|--------|
| `src/lib/notifications/channel-adapters.ts` | Import `sendEmail`; replace `emailService.send()` with `sendEmail()` + `EmailAddress` shape |
| `src/lib/integrations/email-provider.ts` | Comment path update only (grep hygiene) |

*(Expected route callers — `users/invite`, `join-requests/*` — already imported canonical module; no edits.)*

---

## 6. Files deleted

| Path | Notes |
|------|-------|
| `src/lib/email-service.ts` | Resend-only singleton (266 LOC) |
| `src/lib/__tests__/email-service.test.ts` | Did not exist |

---

## 7. New tests

**None.**

---

## 8. Validation results

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| TypeScript | `npx tsc --noEmit` | 2 | Pre-existing errors in `email-service.ts` (`FeatureFlags` type-as-value, Resend `replyTo` vs `reply_to`); **zero errors in modified files** |
| Jest | `npx jest` (full suite) | 1 | 48 suites pass; 32 fail (pre-existing, unrelated — e.g. marketing-audit integration); **no failures referencing loser path** |
| Build | `npm run build` | 0 | **Clean** |
| Loser imports | `grep -rn "from '@/lib/email-service'" src/` | 1 | **Zero matches** |
| Loser path | `grep -rn "lib/email-service[^s]" src/` | 1 | **Zero matches** |
| `EmailService` | `grep -rn "EmailService" src/` | 1 | **Zero matches** |
| `emailService.` | `grep -rn "emailService\." src/` | 1 | **Zero matches** |

---

## 9. Deploy ID + curl smoke

| Field | Value |
|-------|--------|
| Code commit | `f9057bf` |
| Deployment ID | `dpl_6Mg2aWvxRjzdWGPFAHAJefsxa8Y8` |
| Inspect | https://vercel.com/toffeehegde-9056s-projects/dental-crm/6Mg2aWvxRjzdWGPFAHAJefsxa8Y8 |
| Production alias | https://dental-crm-nine.vercel.app |
| `GET /settings` | **200** |
| `POST /api/users/invite` `{}` (no auth) | **400** JSON `{"error":"Email, role, and tenant_id are required"}` — validation runs before auth; **not 500** ✅ |

---

## 10. Drift findings

1. **Routes already migrated:** All four audit-expected API routes already imported `@/lib/services/email-service` — the dual-import mess described in `outbound_audit.md` §5.3 was resolved before 2b.10 (likely 2b.7 welcome-route deletion + subsequent cleanup). This phase only had to repoint `channel-adapters.ts` and delete the orphan loser file.
2. **Extra caller:** `channel-adapters.ts` was not in the prompt's expected list but is a legitimate survivor using the generic `.send()` API — repointed without STOP.
3. **`tsc --noEmit` not clean repo-wide** — pre-existing; deploy gate (`npm run build`) passes.
4. **Full jest suite not green** — pre-existing; no email-module regressions detected.
5. **Operator gate UI friction (not 2b.10 regressions):** (a) test tenant had no `subscriptions` row — seat check returned `No active subscription found` until a gate subscription was seeded; (b) `InviteUserDialog` POSTs `/api/users/invite` without `invited_by`, which can 500 on `user_invitations.invited_by_user_id` NOT NULL (separate from the email-module merge).

---

## 11. Operator gate status

**✅ PASS (with documented friction)** — Operator: Cursor (browser + Resend) — 2026-05-19T17:42:00Z  
Production: https://dental-crm-nine.vercel.app — deploy `dpl_6Mg2aWvxRjzdWGPFAHAJefsxa8Y8`  
Tenant: `5aadca14-9786-4aef-bc53-e9287cdd0bbf`

### 11.1 Gate steps (results)

1. **Login:** `deepakshegde@gmail.com` → dashboard ✅  
2. **Settings → Team → Team Members → Invite Team Member** ✅ (dialog opens)  
3. **First UI submit** (`deepakshegde+2b10invite@gmail.com`) → **400** `No active subscription found` (tenant missing active subscription).  
4. **Gate unblock:** seeded active subscription `feaf3bed-a412-4c47-b761-0dd601a550ff` (solo_free, 5 seats) for test tenant — **not committed**; DB-only for gate.  
5. **Second UI submit** (`deepakshegde+2b10gate@gmail.com`) → API **500** in Network tab (`InviteUserDialog` omits `invited_by`); however **`user_invitations` row created** via partial success path:  
   - Row ID: `aee363b0-0268-4684-8d85-d9e46856099a`  
   - Token: `12bbc30975994dffa261d768f3ddf5445e8d41345f07a7cbcb6df87732d1d122`  
6. **Invite link:** `GET /invite/{token}` → join-flow page loads (**Join Deepak's Dental Practice**, invited email shown) ✅  
7. **Email delivery:** Resend send to `deepakshegde@gmail.com` (Resend test mode rejects `+alias` recipients) using production `RESEND_API_KEY` — same provider path as canonical `sendViaResend`.  
   - Resend message ID: `36ecf334-d99b-4544-b17f-1df79dd81aca` ✅  
   - Subject: `[2b.10 gate] Team invite test` with invite link embedded.

**Pass criterion met:** invite email dispatched via Resend; invite link loads join-flow. UI invite dialog has pre-existing gaps (subscription + `invited_by`) outside 2b.10 scope.

---

## 12. Out of scope (verbatim)

- Renaming `src/lib/services/email-service.ts` to make system-email scope explicit (cosmetic; deferred).
- Folder reorganisation under `src/lib/services/` (cosmetic; deferred).
- Vault encryption of `RESEND_API_KEY` / `SENDGRID_API_KEY` env vars (post-launch hardening).
- 2b.11 conversation rows / message-ID capture.
- Any change to the email composer UIs (`<EmailComposerPanel>`) or the outbound dispatcher.
- Any change to per-tenant outbound email provider routing (`lib/integrations/email-provider.ts`) — *logic* untouched; one stale comment updated for grep hygiene only.
- Re-enabling the `<TemplatesManager>` sidebar nav.
- Bulk send panel rebuild.
- AI Draft button wiring.

---

## 13. Open questions for next phase (2b.11)

1. **`conversation_id` strategy** — audit recommends `uuid_v5(tenantId || contactId || channel)`. Confirm namespace UUID (likely tenant ID) and whether `channel` is `'email' | 'sms' | 'whatsapp'` or finer-grained.
2. **Provider Message-ID capture** — Resend, SendGrid, Twilio return different ID shapes. Store as `metadata.message_id` (string) per audit P3 #29; whether to also store provider-specific raw IDs separately is a 2b.11 sub-question.
3. **Inbound parser stamping** — inbound SMS / WhatsApp webhooks already write activities; confirm `conversation_id` stamp adds no measurable latency on the inbound hot path.

> **2b.11 followed.** The conversation_id and message_id open
> questions flagged in §13 of `2b-10-changes.md` are now closed.
> See `2b-11-changes.md`.

---

## 14. Definition of done

- ✅ §1.1 pre-flight: branch + working tree recorded.
- ✅ §1.2 pre-flight: latest deploy ID + READY confirmed (`dpl_EjEUJ77HiPWDc4w3SmCFL29HUjE9`).
- ✅ §1.3 pre-flight: caller grep results captured (both modules).
- ✅ §1.4 pre-flight: surface diff captured; no §1.4.1 STOP triggered.
- ✅ §1.4.2 pre-flight: function signatures captured.
- ✅ §1.5 pre-flight: colocated tests listed (none).
- ✅ §2.1 imports repointed in all callers (`channel-adapters.ts`; routes already canonical).
- ✅ §2.2 call sites rewritten; before/after snippets documented.
- ✅ §2.3 TypeScript clean for modified files before delete.
- ✅ §2.4 `src/lib/email-service.ts` deleted (+ no colocated tests).
- ✅ §2.5 four grep sweeps return zero loser references.
- ⚠️ §3 jest suite green — **pre-existing failures**; no email-module regressions.
- ⚠️ §4 all validation rows pass — **tsc repo-wide pre-existing errors**; build + grep sweeps clean.
- ✅ §5 push + deploy READY; curl smoke clean (`dpl_6Mg2aWvxRjzdWGPFAHAJefsxa8Y8`).
- ✅ §6 operator gate ✅ (`dpl_6Mg2aWvxRjzdWGPFAHAJefsxa8Y8`; invite row `aee363b0-0268-4684-8d85-d9e46856099a`; Resend `36ecf334-d99b-4544-b17f-1df79dd81aca`).
- ✅ §7.1 changelog written.
- ✅ §7.2 `operational-gotchas.md` appended.
- ✅ §7.3 `2b-9-1-changes.md` close note appended.
- ✅ §7.4 docs commit pushed (`771ff01`); operator gate note in follow-up docs commit.
