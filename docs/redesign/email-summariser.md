# Email Summariser — new feature spec

> Phase 2b.36 subset — generates a one-paragraph AI summary of every email
> (inbound and outbound) so the chat-bubble timeline can render emails
> compactly. See [[contact-detail]]. New AI build.

## Job-to-be-done

Emails are long. The chat-bubble timeline can't render full email bodies
inline — it would dominate the view and defeat the "compact bubbles"
principle. The summariser produces a 1–3 sentence summary that captures the
gist, which renders inside the bubble. The full body is available in the
click-to-detail side slide-out.

## Where summaries appear

- **Chat bubble** on the contact detail page — replaces the full email body
  as the bubble content. See [[contact-detail]] Section D.
- **Activity preview** on the dashboard's "Unread Inbound" lane — when an
  inbound email shows up in the lane, the summary is what the operator
  sees before deciding to click in.
- **Deals Kanban card** — if "last activity" was an email, the channel
  icon expands to a tooltip with the summary on hover.

Full email body always available via the side slide-out (click bubble).

## Example output

For a 600-word inbound email asking for implant pricing details:

> "Asking for itemised pricing on the full-arch implant treatment plan,
> including any financing options. Mentions a sibling who recently had
> implants in Manchester for £6,200 and wants to know how our quote
> compares."

For a 400-word outbound email sending a brochure:

> "Sent the implant pricing brochure and offered to book a consultation
> next Tuesday or Thursday. Asked them to reply with their preferred slot."

1–3 sentences. ~30–60 words. UK English, factual, no fluff.

## Computation

### Inputs

Per email activity:
- Subject line
- Body (plain text + stripped HTML)
- From address
- Direction (inbound / outbound)
- Any inline AI metadata already present (ai_purpose, etc.)

### Prompt shape

```
Summarise this UK dental practice email in 1–3 sentences (~30–60 words).
Capture the key intent or action. Factual, no fluff. UK English.

Direction: {inbound|outbound}
Subject: {subject}
Body:
{body — plain text, max 4000 chars}

SUMMARY:
```

Claude Haiku 4.5. Fallback if Claude unavailable: subject line + first 120
chars of body, truncated with ellipsis.

### When summaries are generated

- **On insert** — when an email activity row is created (inbound webhook or
  outbound dispatch), fire-and-forget a summariser job. Done via a queue
  (Vercel Queue / Supabase Edge Function / simple cron-fetched backlog
  table — TBD during audit).
- **On read** — if the bubble renders and there's no summary yet, show "AI
  summarising…" placeholder + the fallback (subject + first 120 chars).
  When the summary lands, swap it in via a real-time subscription or a
  re-poll.

### Storage

Two options:

Option A — column on `activities`:
- `ai_email_summary text`, `ai_email_summary_generated_at timestamptz`.

Option B — sidecar table `activity_ai_summaries`:
- (`tenant_id`, `activity_id`, `summary`, `model_version`, `generated_at`).

Lean: Option A — `activities` already carries an `metadata` jsonb column
where AI-derived fields live (`ai_purpose`, `ai_outcome`, `ai_sentiment`).
Add `ai_email_summary` to that same jsonb.

## Rendering states

1. **Has summary** — render summary in bubble. Small "AI" pill in the
   footer signals it's a summary, not the body verbatim.
2. **No summary yet, < 30s old** — render fallback (subject + first 120
   chars) with a thin "Summarising…" tag.
3. **No summary, > 30s old** — render fallback. No "summarising" tag.
   Click-to-detail still shows full body.
4. **Summary failed** — render fallback. No retry surfaced to the operator
   (we don't want to clutter the bubble); admin retry available via
   debug endpoint.

## Privacy / safety

- Email bodies never leave Anthropic's API boundary (no third-party
  forwarding). Summary outputs stored in tenant DB.
- HTML-stripped before sending to Claude (no <script> exfiltration via
  prompt injection — defence-in-depth alongside output sanitisation).
- Output rendered as plain text only (no HTML, no Markdown).

## Cost considerations

A dental practice running 100 emails/day at ~600 words avg = ~100k tokens
input + ~30k output per day. Claude Haiku 4.5 cost is negligible at that
volume (<£0.10/day per practice). Acceptable. We do NOT need to batch.

## API surface

- Internal helper `lib/ai/summariseEmail.ts` — pure function, called from
  the activity-insert webhook + the bubble render-fallback path.
- No public REST endpoint (called from the server-side path).

## Implementation phases (slice of 2b.36)

- 2b.36.43: `summariseEmail` helper + Claude prompt + fallback.
- 2b.36.44: Wire into inbound email webhook (`/api/inbound/email`) — fire
  summariser on insert.
- 2b.36.45: Wire into outbound email dispatch (`/api/dispatch/email` or
  equivalent) — fire summariser after successful send.
- 2b.36.46: Frontend bubble render — read `metadata.ai_email_summary`,
  fall back gracefully when missing.
- 2b.36.47: Backlog job — one-shot script to summarise existing email
  activities for the test tenant so the chat UI shows summaries from day
  one.

## Out of scope

- Multi-language summarisation.
- Per-tenant summariser style customisation.
- Summary editing by the operator.
- Summarising email threads as a whole (we summarise each email
  separately).
