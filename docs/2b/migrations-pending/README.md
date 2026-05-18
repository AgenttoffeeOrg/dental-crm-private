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

_None._ The 2b.8 column-drop migration was applied in phase 2b.8.1
(see `docs/2b/2b-8-1-changes.md`). Forward file:
`supabase/migrations/20260518194500_phase_2b_8_1_drop_legacy_outbound_columns.sql`;
rollback companion:
`supabase/migrations/ROLLBACK_20260518194500_phase_2b_8_1_drop_legacy_outbound_columns.sql`.
