/**
 * Phase 2a.3 — Thin REST client used by the React widget.
 *
 * Lives next to the widget so it ships in the embed bundle. Uses fetch
 * directly (no project-wide auth wrapper); resolves the API base URL from
 * the constructor so it works on third-party sites where it must point at
 * the CRM domain.
 */

export interface WidgetApiClientOptions {
  /** Origin of the CRM, e.g. https://app.example.com. Empty string = same origin. */
  apiBase: string
}

export interface StartSessionResponse {
  session_id: string
  session_token: string
  expires_at: string
  intent_path: string
}

export interface SubmitResponse {
  ok: boolean
  idempotent_replay?: boolean
  dedup_decision?: string
  contact_id?: string | null
  whatsapp_redirect?: string | null
  calendar_redirect?: string | null
  success_message?: string | null
}

export class WidgetApiClient {
  private apiBase: string
  constructor(opts: WidgetApiClientOptions) {
    this.apiBase = opts.apiBase ?? ''
  }

  private url(path: string): string {
    if (!this.apiBase) return path
    return `${this.apiBase.replace(/\/$/, '')}${path}`
  }

  async startSession(input: {
    widget_slug: string
    source_url?: string
    referrer_url?: string
    utm?: Record<string, string | undefined>
    click_ids?: Record<string, string | undefined>
  }): Promise<StartSessionResponse> {
    const res = await fetch(this.url('/api/widget/sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`startSession failed: ${res.status}`)
    return (await res.json()) as StartSessionResponse
  }

  async patchSession(
    sessionId: string,
    body: { treatment_offering_id?: string; path_chosen?: string; abandoned_step?: string }
  ): Promise<void> {
    // Best-effort; failure is non-fatal for the widget UX.
    try {
      await fetch(this.url(`/api/widget/sessions/${sessionId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      })
    } catch (err) {
      console.warn('[BookingWidget] patchSession failed:', err)
    }
  }

  async submit(sessionId: string, body: unknown): Promise<SubmitResponse> {
    const res = await fetch(this.url(`/api/widget/sessions/${sessionId}/submit`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let payload: SubmitResponse | { error?: string } = {}
    try {
      payload = await res.json()
    } catch {
      // ignore parse errors
    }
    if (!res.ok) {
      const error = (payload as { error?: string }).error ?? `HTTP ${res.status}`
      throw new Error(`submit failed: ${error}`)
    }
    return payload as SubmitResponse
  }
}

/**
 * Pluck UTM + click ids out of the current URL search params. Used by the
 * widget at start time to record the session's marketing attribution.
 */
export function readAttributionFromUrl(href: string): {
  source_url: string
  utm: Record<string, string | undefined>
  click_ids: Record<string, string | undefined>
} {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { source_url: href, utm: {}, click_ids: {} }
  }
  const params = url.searchParams
  return {
    source_url: href,
    utm: {
      source: params.get('utm_source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
      term: params.get('utm_term') ?? undefined,
      content: params.get('utm_content') ?? undefined,
    },
    click_ids: {
      gclid: params.get('gclid') ?? undefined,
      fbclid: params.get('fbclid') ?? undefined,
      ttclid: params.get('ttclid') ?? undefined,
      msclkid: params.get('msclkid') ?? undefined,
    },
  }
}
