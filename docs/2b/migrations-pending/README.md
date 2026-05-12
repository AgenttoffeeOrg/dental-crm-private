# Migrations pending approval

Files in this directory are SQL migrations authored by a phase but not
yet applied. They live here (instead of `dental-crm/supabase/migrations/`)
deliberately, so the standard migration apply path cannot pick them up
by accident.

## How to apply

1. Planner reviews and approves the migration.
2. Move the `.sql` file into `dental-crm/supabase/migrations/` with a
   fresh `YYYYMMDDHHMMSS` timestamp prefix.
3. Move the `_rollback.sql` companion alongside it.
4. Apply via the project's standard migration path (supabase MCP
   `apply_migration` or `npx supabase db push` in CI).
5. Regenerate TypeScript types (supabase MCP `generate_typescript_types`)
   so `src/types/supabase.ts` reflects the new schema.
6. Run the post-apply check from the migration file's tail comment.
7. Document in the phase's changelog.

## Currently pending

- `20260512_phase_2b_8_drop_legacy_outbound_columns.sql`
  Drops 14 legacy plain-text outbound credential columns on `tenants`
  and the orphaned `email_logs` table. Authored by 2b.8. Awaiting
  apply approval. Preserves 5 columns explicitly (`sms_phone_number`,
  `whatsapp_phone_number`, `email`, `email_main`, `email_support`) —
  see the migration file header for the per-column rationale.
- `20260512_phase_2b_8_drop_legacy_outbound_columns_rollback.sql`
  Rollback companion. Restores the dropped columns with original types,
  nullability, and defaults, plus the `email_logs` table verbatim from
  `supabase/migrations/20251014_email_logs.sql`. Data is **not**
  restored.
