/**
 * Google Calendar Sync
 * Two-way synchronization with Google Calendar
 */

import { createClient } from '@/lib/supabase-client'

export interface GoogleCalendarConfig {
  tenantId: string
  accessToken: string
  refreshToken: string
  calendarId: string
  pushToGoogle: boolean
  pullFromGoogle: boolean
  syncPastEvents: boolean
}

export class GoogleCalendarSync {
  private readonly supabase = createClient()
  private readonly apiBase = 'https://www.googleapis.com/calendar/v3'

  /**
   * Initialize OAuth flow
   * @returns Authorization URL for user to visit
   */
  getAuthorizationUrl(tenantId: string, redirectUri: string): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: tenantId, // Pass tenant ID in state
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${data.error_description || data.error}`)
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error_description || data.error}`)
    }

    return data.access_token
  }

  /**
   * Push appointment to Google Calendar
   */
  async pushAppointment(
    accessToken: string,
    calendarId: string,
    appointment: any
  ): Promise<string> {
    const event = {
      summary: appointment.title,
      description: appointment.notes,
      start: {
        dateTime: appointment.start_at,
        timeZone: appointment.timezone || 'UTC',
      },
      end: {
        dateTime: appointment.end_at,
        timeZone: appointment.timezone || 'UTC',
      },
      attendees: appointment.contact?.primary_email ? [{
        email: appointment.contact.primary_email,
        displayName: appointment.contact.full_name,
      }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    }

    const url = `${this.apiBase}/calendars/${encodeURIComponent(calendarId)}/events`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`)
    }

    // Update appointment with Google event ID
    await this.supabase
      .from('appointments')
      .update({
        google_event_id: data.id,
        external_sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    console.log(`[Google Sync] Pushed appointment ${appointment.id} to Google Calendar`)

    return data.id
  }

  /**
   * Pull events from Google Calendar
   */
  async pullEvents(
    accessToken: string,
    calendarId: string,
    tenantId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<void> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const url = `${this.apiBase}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`)
    }

    console.log(`[Google Sync] Pulled ${data.items?.length || 0} events from Google Calendar`)

    // TODO: Process and create/update appointments in Supabase
    // This would involve:
    // 1. Check if event already exists (by google_event_id)
    // 2. If exists, update if modified
    // 3. If new, create appointment
    // 4. Handle conflict resolution based on settings
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const url = `${this.apiBase}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok && response.status !== 404) {
      const data = await response.json()
      throw new Error(`Google Calendar API error: ${data.error?.message || 'Unknown error'}`)
    }

    console.log(`[Google Sync] Deleted event ${eventId} from Google Calendar`)
  }

  /**
   * Setup webhook for real-time sync
   */
  async setupWebhook(
    accessToken: string,
    calendarId: string,
    webhookUrl: string
  ): Promise<void> {
    const url = `${this.apiBase}/calendars/${encodeURIComponent(calendarId)}/events/watch`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `calendar-watch-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Webhook setup failed: ${data.error?.message || 'Unknown error'}`)
    }

    console.log('[Google Sync] Webhook configured:', data.resourceId)
  }
}

export const googleCalendarSync = new GoogleCalendarSync()

