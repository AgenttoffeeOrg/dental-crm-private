# AI Persona Summary — new feature spec

> Phase 2b.36 subset — synthesises a 2–3 sentence "what kind of person is
> this" blurb from a contact's full conversation history. Appears on the
> contact detail page (see [[contact-detail]]). New AI build — no equivalent
> exists today.

## Job-to-be-done

When a new operator (or one returning to a contact after months) opens the
contact, the persona summary gives them a 5-second read of:

- How this person communicates (channel preference, tone).
- What stage of the journey they're in (just inquired vs. long-standing
  patient).
- Anything they've said that's specific or memorable (budget concerns,
  family context, prior practice complaints, etc.).
- Practice-side notes (the treatment coordinator's observations).

It's NOT:

- A list of facts (deal counts, LTV — those live in the [[contact-detail]]
  top strip).
- The conversation itself (that's the chat below).
- An action prompt (NBA card moved out of /contacts).

## Example output

> "Decisive but price-conscious; prefers SMS over phone, responds same-day.
> First enquired about Invisalign in October, ghosted, came back in March
> asking about implants. Treatment coordinator's note: dislikes being
> chased by email."

3 sentences max. ~50–80 words. No bullets, no headings — just prose.

## Where it appears

- **Contact detail page** — small card under the top strip. See
  [[contact-detail]] Section B.
- **Deal detail page** (`/deals/[id]`) — same card if a contact-level
  persona is available, with a hint that it's contact-wide (not deal-
  specific).

NOT appearing on the contacts list, the dashboard, or the Kanban.

## Computation

### Inputs

Per contact:
- All `activities` rows — direction, type, body / description, snippet,
  occurred_at, AI metadata (ai_purpose, ai_outcome, ai_sentiment if present),
  call transcript summary if present.
- All `notes` (operator-authored notes attached to activities or the
  contact).
- All `deals` — title, pipeline, stage, status, value, created_at.
- Contact-level fields — tags, source channel, first/last touch attribution.

Cap: most-recent N=200 activities to keep the prompt under Claude's window.
Older history is summarised separately and prepended ("Background: ...").

### Prompt shape

```
You are a CRM assistant for a UK dental practice. Summarise the following
patient's communication history in 2–3 sentences. Focus on:
1. How they communicate (channel preference, response speed, tone)
2. What journey stage they're in
3. Anything specific or memorable

Style: factual, no fluff. No bullets. ~50–80 words. UK English.

CONTACT: {name}, source {source}, tags {tags}
DEALS: {list of deals — title · status · value}
RECENT ACTIVITY (most recent 200):
{rendered activity log — direction · type · body/description · time · ai
labels}
NOTES: {operator-authored notes}

OUTPUT:
```

Uses Claude Haiku 4.5 (cheap, fast, fine for summarisation). Falls back to
a deterministic templated string if Claude is unavailable ("X open deals
across N pipelines. First contact: {date}. Most recent: {date}.").

### Refresh cadence

- **Nightly batch** — a cron at 03:00 tenant-local time regenerates all
  contacts touched in the last 24 hours.
- **On-demand** — when the operator opens a contact whose summary is > 24h
  old OR missing, regenerate inline (Promise.race against a 3s timeout;
  fall back to the cached version if Claude is slow).
- **Manual refresh** — small "↻" icon next to the summary, click to force
  regenerate.

### Storage

New table or columns on existing tables:

Option A — new table `contact_personas`:
- `tenant_id`, `contact_id`, `summary` (text), `model_version`,
  `generated_at`, `input_activity_count`, `is_fallback` (bool).
- Unique on (tenant_id, contact_id).

Option B — columns on `contacts`:
- `persona_summary text`, `persona_generated_at timestamptz`,
  `persona_model_version text`.

Lean: Option A. Keeps `contacts` table lean and lets us track multiple
historical versions if we want diff/audit later.

## API surface

- `POST /api/contacts/[id]/persona/regenerate` — admin endpoint that forces
  recomputation. Returns the new summary inline.
- `GET /api/contacts/[id]/persona` — fetches the cached summary (used by
  the contact detail page if not server-rendered).

Both gated by tenant + contact RLS.

## Rendering states

1. **Fresh summary (< 24h):** display as-is.
2. **Stale summary (> 24h):** display + small "Refreshing…" pill, fire
   regenerate in background, swap in when ready.
3. **No summary yet:** display "Generating summary…" + skeleton. Fire
   regenerate. Falls back to the deterministic templated string if Claude
   takes > 3s.
4. **Generation failed:** display the deterministic templated string with
   a small "AI summary unavailable" hint.
5. **No data yet** (brand new contact, 0 activities): display "Not enough
   history yet — open a conversation to see a summary appear."

## Privacy / safety

- Summaries are stored in the tenant's database, not shared cross-tenant.
- The model prompt never includes PII beyond what's already in the
  activity bodies. No SSNs, no card numbers (those aren't stored either).
- Output is sanitised before render (DOMPurify) — Claude can't inject
  HTML.

## Implementation phases (slice of 2b.36)

- 2b.36.38: Schema — `contact_personas` table + migration + RLS.
- 2b.36.39: Backend computation — `lib/contacts/persona.ts` with prompt +
  Claude call + fallback.
- 2b.36.40: GET + POST endpoints under /api/contacts/[id]/persona/.
- 2b.36.41: Nightly cron handler — regenerate stale rows.
- 2b.36.42: Frontend card on contact detail — wired to the GET endpoint
  with the 5 render states above.

## Out of scope

- Multi-language persona output (UK English only).
- Operator-editable persona overrides ("the AI is wrong, here's what
  she's really like").
- Persona comparison across two contacts.
- Persona-driven personalisation of outbound copy (separate future feature).
