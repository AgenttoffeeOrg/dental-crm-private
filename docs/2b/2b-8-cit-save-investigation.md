# 2b.8 — Communications Integrations Tab (CIT) save investigation

**Date:** 2026-05-13  
**Context:** Operator gate item 2 reported that **Save SMS Settings** shows a toast: *"Database migration required to save settings"* and the save does not persist.

**Scope:** Read-only investigation. No migrations applied, no code changes to the CIT component or any route handler.

---

## 1. Executive summary

The failure is **not** caused by a missing database migration on production.

- **Root cause:** `CommunicationsIntegrationsTab` does **not** call any API route on save. The `saveSettings` function is intentionally **stubbed**: it always shows an informational toast whose **description** is the literal string *"Database migration required to save settings"*, then returns. The real persistence path (Supabase client `upsert` into `integration_settings`) is **commented out** behind a `TODO`.
- **Live database:** `public.integration_settings`, `public.integration_channel_settings`, and `public.integration_secret_vault` **all exist**. For test tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`, a row **exists** in `integration_settings`; there is **no** row in `integration_channel_settings` or `integration_secret_vault` for that tenant (read-only observation — not the reason the Save button no-ops).

**Conclusion:** The operator-facing message is **misleading**: it implies schema is missing, but the actual gap is **unimplemented client save/load** in `communications-integrations-tab.tsx`. Applying another SQL migration will not fix the button until that code path is enabled or replaced with a proper API.

---

## 2. Save flow in `CommunicationsIntegrationsTab`

**File:** `src/components/settings/communications-integrations-tab.tsx`

### 2.1 Is there an API route on Save?

**No.** There is no `fetch('/api/...')` in `saveSettings` or elsewhere for persisting integration settings.

All channel **Save** buttons use the same handler:

- Email tab: `onClick={saveSettings}` (see ~line 366 in the current file)
- **SMS tab — “Save SMS Settings”:** `onClick={saveSettings}` (~line 475)
- WhatsApp / Voice tabs: same pattern

### 2.2 What `saveSettings` actually does

```157:186:src/components/settings/communications-integrations-tab.tsx
  const saveSettings = async () => {
    setLoading(true)
    
    // TODO: Implement when integration_settings table is created
    toast.info('Save integration settings', {
      description: 'Database migration required to save settings'
    })
    
    setLoading(false)
    
    /* Uncomment when integration_settings table is created:
    const supabase = createClient()
    
    const { error } = await supabase
      .from('integration_settings')
      .upsert({
        ...settings,
        tenant_id: orgId,
        updated_at: new Date().toISOString()
      })
    ...
    */
  }
```

- **Toast title:** `"Save integration settings"` (`toast.info`, Sonner).
- **Toast description (the string the operator sees):** `'Database migration required to save settings'`.
- **Trigger condition:** **Unconditional.** Every successful click through `saveSettings` hits this toast; there is no runtime check for table existence, migration version, or error codes.

### 2.3 What the commented code *would* have written (if enabled)

If uncommented, the stub would use the **browser Supabase client** (`createClient()` from `@/lib/supabase-client`) to:

- **Table:** `integration_settings`
- **Operation:** `.upsert({ ...settings, tenant_id: orgId, updated_at: ... })`

**Note:** The commented block references `orgId`, which is **not** defined in the visible excerpt of the component today — the load path is also stubbed (see §2.4). Even after uncommenting, wiring tenant context would be required for a correct write.

There is **no** PATCH to `/api/settings/integrations` or similar in this component.

### 2.4 Load path is also disabled

At the start of `loadSettings`, the function sets loading state, creates a client, then **returns immediately** before any query. The entire `from('integration_settings').select(...)` block is commented out.

```93:100:src/components/settings/communications-integrations-tab.tsx
  const loadSettings = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Note: This component needs tenant context when integration_settings table exists
    // For now, skip loading and use defaults
    setLoading(false)
    return
```

So the UI can **render** with default empty state while **never** reading existing DB values — independent of whether migrations exist.

---

## 3. Source of the exact toast string

| Item | Detail |
|------|--------|
| **String** | `Database migration required to save settings` |
| **Location** | `src/components/settings/communications-integrations-tab.tsx`, `description` property of `toast.info` inside `saveSettings` (~line 162) |
| **Trigger** | **Always** when `saveSettings()` runs (no `if` / no error branch). |

No other `src/` file contains this exact string (repo-wide grep: single hit).

---

## 4. Live database (read-only) — tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`

Queries executed via Supabase MCP (`execute_sql`, read-only).

### 4.1 Table existence (`public`)

| Table | Present |
|-------|---------|
| `integration_settings` | Yes |
| `integration_channel_settings` | Yes |
| `integration_secret_vault` | Yes |

### 4.2 `integration_settings` row for the test tenant

A row exists for this `tenant_id`:

- `id`: `e432648b-1a56-44d7-9c41-b5cab3143789`
- SMS-related fields observed as empty / false in the snapshot queried: `sms_account_sid` null, `sms_from_number` null, `is_sms_configured` false

So the **integration_settings** table is not only present — it already holds a tenant row.

### 4.3 Other integration tables for the same tenant

| Table | Row for test tenant? |
|-------|----------------------|
| `integration_channel_settings` | **No row** returned |
| `integration_secret_vault` | **No row** returned |

These gaps are **orthogonal** to the current Save button behaviour: the UI never attempts an insert/update because of the stub (§2).

### 4.4 RLS on `integration_settings` (informational)

Policies exist including tenant-scoped `tenant_select_integration_settings` / `tenant_modify_integration_settings` using `current_tenant_id()`, plus a service-role policy. So **authenticated client-side** writes are plausible in principle once the app implements the save path and passes the correct tenant context — subject to product/security choices (e.g. plain-text columns vs vault).

---

## 5. Migration files in the repo (relevant to integrations)

Searched `dental-crm/supabase/migrations/` for `integration_settings`, `integration_channel_settings`, `vault`, `credentials` (and related).

### 5.1 Files that clearly shape the “new” integration stack

| Path | Role |
|------|------|
| `supabase/migrations/20251110_integration_config.sql` | Creates `integration_channel_settings`, `integration_secret_vault`, RLS, and RPCs `integration_store_credentials` / `integration_load_credentials` (pgcrypto-encrypted vault). **Does not** create `integration_settings`. |
| `supabase/migrations/20251111_channel_settings_twilio_columns.sql` | Adds Twilio-oriented columns to `integration_channel_settings`. |
| `supabase/migrations/2025011609_integration_hardening.sql` | Broader integration infrastructure (e.g. `integration_connections`, logs, etc.). |
| `supabase/migrations/20250120_ensure_integration_connections.sql` | Ensures `integration_connections` exists. |

### 5.2 Where `integration_settings` is defined in-repo

The **only** checked-in SQL file under `dental-crm/supabase/` that contains `CREATE TABLE ... integration_settings` is:

- `dental-crm/supabase/sql/19_activity_integrations.sql`

That file lives under `supabase/sql/`, not under `supabase/migrations/` with a timestamp prefix. **Regardless**, the **live** database already has `integration_settings` with the columns expected by the CIT comment block (verified via `information_schema.columns`).

### 5.3 Is there a migration “to apply” to fix the Save button?

**No — not as the primary fix.** Schema for `integration_settings` is already present remotely. The button is blocked by **application logic** (stub + misleading copy), not by absent tables.

---

## 6. Actual gap vs. perceived gap

| Perceived (from toast) | Actual |
|------------------------|--------|
| “Need to run a DB migration before saves work.” | Save handler **never writes** to the DB; toast is **hardcoded**. Tables for the legacy commented path **exist**. |
| Optional: “Maybe `integration_channel_settings` / vault” | For this tenant those rows are **empty**, which would matter for **`loadTenantIntegrationSettings`** channel-first + vault paths — but that is **downstream of fixing save/load in the UI or server**, not fixed by showing a toast. |

---

## 7. Is a migration “safe to apply” to close this?

**N/A for the reported symptom.** Applying existing repo migrations that only **CREATE IF NOT EXISTS** / **ADD COLUMN** style changes is generally low-risk on an already-provisioned DB, but **it will not make the CIT Save button persist** until the stub is removed or replaced.

If the planner adds **new** migrations (e.g. aligning `sql/19` with `migrations/`), prefer:

- **Idempotent** `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
- No destructive drops without a dedicated phase

---

## 8. Recommended next steps (for planner / 2b.9+)

1. **Treat this as a product/eng task, not a DBA migration emergency:** Implement persistence for `CommunicationsIntegrationsTab`:
   - **Option A:** Uncomment and finish the client `upsert` path with correct `tenant_id` resolution, `loadSettings` query, and RLS-safe behaviour.
   - **Option B (often preferable for secrets):** Add an authenticated **API route** using the service role (or RPCs `integration_store_credentials`) to avoid storing raw tokens in the browser bundle and to centralize validation.

2. **Remove or rewrite the toast** so operators are not told “migration required” when the real issue is **TODO / stub**.

3. **Align architecture with `loadTenantIntegrationSettings`** (`lib/integrations/tenant-integration-config.ts`): dispatcher prefers channel settings + vault + legacy `integration_settings` + env. Decide whether CIT should write **only** `integration_settings`, or also upsert **`integration_channel_settings`** / vault for parity with server-side loading.

4. **Optional housekeeping:** If `supabase/sql/19_activity_integrations.sql` is the canonical DDL for `integration_settings`, consider a **forward-only** migration under `supabase/migrations/` that matches production (for greenfield clones) — distinct from the CIT stub issue.

---

## 9. References (code)

- `src/components/settings/communications-integrations-tab.tsx` — `saveSettings`, `loadSettings`, toast string.
- `src/lib/integrations/tenant-integration-config.ts` — how settings are loaded for dispatch.
- `supabase/migrations/20251110_integration_config.sql` — channel + vault schema.
- `supabase/sql/19_activity_integrations.sql` — `integration_settings` DDL in-repo.

---

*End of investigation.*
