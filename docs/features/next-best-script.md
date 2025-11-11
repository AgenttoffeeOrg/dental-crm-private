## Next-Best Script Panel (Phase 1)

The Next-Best Script panel surfaces the top objection-handling playbooks for a contact, combining seeded templates with tenant-specific metrics.

### Components

- **Script Library Seeder** (`ensureScriptLibrarySeeded`) populates `sales_scripts` and `sales_script_versions` the first time a tenant requests recommendations. Templates live in `src/lib/services/script-library.ts`.
- **Recommendation Service** (`selectScripts`) ranks scripts based on trigger, persona alignment, helpful feedback, and usage saturation.
- **Usage & Outcome Tracking** (`sales_script_usages`, `conversation_outcomes`) persist “Use Script” actions, helpful/not-helpful feedback, and downstream outcomes, refreshing success metrics via database triggers.
- **UI Panel** (`NextBestScriptPanel`) allows agents to:
  - Choose a scenario (price objection, anxiety, timing, etc.)
  - Copy or log a script
  - Provide “Was this helpful?” feedback and contextual notes
  - Record appointment/deal outcomes that flow straight into analytics

### API Surface

| Route | Description |
| --- | --- |
| `GET /api/scripts/recommendations` | Returns ranked script recommendations for a given trigger/contact |
| `POST /api/scripts/usages` | Logs a script usage event with optional immediate feedback |
| `PATCH /api/scripts/usages/{id}` | Updates existing usage with helpful/not helpful notes and comments |
| `POST /api/scripts/outcomes` | Records downstream outcomes (appointment booked, deal won, etc.) for a script usage |

### Data Flow

1. Contact detail view loads recommendations via `/api/scripts/recommendations`.
2. Selecting “Use Script” calls `/api/scripts/usages`, updating `sales_script_usages`.
3. Helpful/not helpful responses feed back into `sales_script_versions` metrics, influencing future rankings.
4. Outcome logging (via panel, scheduling flows, or deal updates) inserts into `conversation_outcomes` and drives success-rate recalculations.
5. Optional feedback text is stored for qualitative review and future learning-loop jobs.

### Operational Notes

- Script templates can be extended by editing `SCRIPT_LIBRARY_TEMPLATES`.
- Triggers and labels for client-side dropdowns live in `src/lib/services/script-trigger-metadata.ts`.
- Outcome metadata/glossary lives in `src/lib/services/script-outcome-metadata.ts`.
- Success metrics (usage, feedback, outcomes, revenue) are recomputed automatically—no manual cron needed for Phase 1.
- Future phases will enrich persona inference (psychological analyzer) and feed nightly learning-loop jobs that update `success_rate` beyond real-time trigger refreshes.

